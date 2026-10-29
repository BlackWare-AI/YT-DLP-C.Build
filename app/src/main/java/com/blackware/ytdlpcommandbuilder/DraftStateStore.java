package com.blackware.ytdlpcommandbuilder;

import android.util.AtomicFile;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Iterator;
import org.json.JSONObject;

/** Small, synchronous and redundant edits tied to one complete archive generation. */
final class DraftStateStore {
    private final AtomicFile primary, secondary;
    private long revision;
    DraftStateStore(File directory) {
        primary=new AtomicFile(new File(directory,"builder-draft.json"));
        secondary=new AtomicFile(new File(directory,"builder-draft-backup.json"));
    }
    private static String digest(String payload) throws Exception {
        byte[] bytes=MessageDigest.getInstance("SHA-256").digest(payload.getBytes(StandardCharsets.UTF_8));
        char[] hex="0123456789abcdef".toCharArray(), result=new char[bytes.length*2];
        for(int i=0;i<bytes.length;i++) {int b=bytes[i]&255;result[i*2]=hex[b>>>4];result[i*2+1]=hex[b&15];}
        return new String(result);
    }
    private static JSONObject validate(String payload) throws Exception {
        JSONObject value=new JSONObject(payload);
        value.getJSONObject("settings"); value.getJSONArray("cuts");
        if(!(value.get("links") instanceof String) || value.has("history") || value.has("notesDailyHistory")) throw new IllegalArgumentException();
        for(String key:new String[]{"notes","newLink"})
            if(value.has(key) && !(value.get(key) instanceof String)) throw new IllegalArgumentException();
        return value;
    }
    private JSONObject readFile(AtomicFile file) {
        try {
            JSONObject envelope=new JSONObject(new String(file.readFully(),StandardCharsets.UTF_8));
            String payload=envelope.getString("payload"); validate(payload);
            if(!digest(payload).equals(envelope.getString("sha256"))) return null;
            envelope.getLong("base"); envelope.getLong("revision"); return envelope;
        } catch(Exception invalid) { return null; }
    }
    String merge(long base, String full) throws Exception {
        JSONObject a=readFile(primary), b=readFile(secondary), best=null;
        if(a!=null) revision=Math.max(revision,a.getLong("revision"));
        if(b!=null) revision=Math.max(revision,b.getLong("revision"));
        if(a!=null && a.getLong("base")==base) best=a;
        if(b!=null && b.getLong("base")==base && (best==null || b.getLong("revision")>best.getLong("revision"))) best=b;
        if(best==null) {
            if(a==null && b==null && (exists(primary)||exists(secondary))) throw new IllegalStateException("Unreadable draft");
            return full;
        }
        JSONObject merged=new JSONObject(full), draft=validate(best.getString("payload"));
        Iterator<String> keys=draft.keys();
        while(keys.hasNext()) { String key=keys.next();merged.put(key,draft.get(key)); }
        return merged.toString();
    }
    private boolean exists(AtomicFile file) {
        String path=file.getBaseFile().getPath();
        return new File(path).exists() || new File(path+".bak").exists() || new File(path+".new").exists();
    }
    private boolean write(AtomicFile file,String envelope,long expected) {
        FileOutputStream out=null;
        try {
            out=file.startWrite();out.write(envelope.getBytes(StandardCharsets.UTF_8));out.getFD().sync();file.finishWrite(out);out=null;
            JSONObject actual=readFile(file);
            return actual!=null && actual.getLong("revision")==expected && actual.toString().equals(new JSONObject(envelope).toString());
        } catch(Exception failure) {
            if(out!=null) try {file.failWrite(out);} catch(Exception ignored) { }
            return false;
        }
    }
    boolean save(long base,String payload) {
        try {
            validate(payload); long next=Math.max(System.currentTimeMillis(),revision+1);
            String envelope=new JSONObject().put("base",base).put("revision",next).put("payload",payload).put("sha256",digest(payload)).toString();
            if(!write(primary,envelope,next)) return false;
            revision=next;write(secondary,envelope,next);return true;
        } catch(Exception failure) { return false; }
    }
    void clear() {primary.delete();secondary.delete();}
}
