#!/usr/bin/env python3
"""Rock Radio public Icecast metadata -> app/rock-now.json for Nymind TV."""
import html, json, pathlib, re, time, urllib.parse, urllib.request

OUT = pathlib.Path("app/rock-now.json")
MOUNT = "/rockradio128.mp3"
HOSTS = ["https://ice.abradio.cz/", "https://ice.radia.cz/"]

def fetch(url):
    req=urllib.request.Request(url,headers={"User-Agent":"NymindTV/2.0 (Rock Radio public on-air data)"})
    with urllib.request.urlopen(req,timeout=12) as r:
        return r.read(2000000).decode("utf-8","replace")

def split(title):
    title=html.unescape(re.sub(r"\s+"," ",str(title or ""))).strip()
    if " - " not in title:return None
    artist,song=title.split(" - ",1)
    if 0<len(artist)<140 and 0<len(song)<180:return artist,song
    return None

def parse_json(raw):
    d=json.loads(raw).get("icestats",{}).get("source",[])
    if isinstance(d,dict):d=[d]
    for s in d:
        if MOUNT in str(s.get("listenurl",s.get("server_url",""))):
            title=split(s.get("title",s.get("yp_currently_playing","")))
            if title:return title
    return None

def parse_html(raw):
    for mt in re.finditer(re.escape(MOUNT),raw,re.I):
        part=raw[mt.end():mt.end()+15000]
        end=re.search(r"<h[234][^>]*>[^<]*(?:Mountpoint|Mount Point)",part,re.I)
        if end:part=part[:end.start()]
        match=re.search(r"Currently\s+playing\s*:\s*</t[dh]>\s*<t[dh][^>]*>(.*?)</t[dh]>",part,re.I|re.S)
        if not match:continue
        value=html.unescape(re.sub(r"<[^>]+>"," ",match.group(1)))
        result=split(value)
        if result:return result
    return None

def lookup_art(artist,song):
    params=urllib.parse.urlencode({"entity":"song","country":"CZ","limit":5,"term":artist+" "+song})
    try:
        items=json.loads(fetch("https://itunes.apple.com/search?"+params)).get("results",[])
        norm=lambda x:re.sub("[^a-z0-9]","",str(x).lower())
        for item in items:
            a=norm(item.get("artistName",""));t=norm(item.get("trackName",""))
            if a and t and (a in norm(artist) or norm(artist) in a) and (t in norm(song) or norm(song) in t):
                img=item.get("artworkUrl100","")
                if img.startswith("https://"):return img.replace("100x100","600x600")
    except Exception as e:print("Artwork unavailable:",e)
    return ""

def main():
    result=None
    for suffix in ("status-json.xsl","status.xsl"):
        for host in HOSTS:
            try:
                raw=fetch(host+suffix)
                result=parse_json(raw) if suffix=="status-json.xsl" else parse_html(raw)
                if result:break
            except Exception as e:print("Source failed:",host+suffix,str(e))
        if result:break
    if not result:
        raise SystemExit("No song obtained; preserving existing metadata.")
    artist,song=result
    previous={}
    if OUT.exists():
        try:previous=json.loads(OUT.read_text(encoding="utf-8"))
        except (ValueError,OSError):pass
    now=int(time.time())
    same=previous.get("artist")==artist and previous.get("song")==song
    if same and now-int(previous.get("updated",0))<600:
        print("Song unchanged; metadata cache recent")
        return
    img=previous.get("img","") if same else lookup_art(artist,song)
    OUT.parent.mkdir(parents=True,exist_ok=True)
    OUT.write_text(json.dumps({"station":"rockradio","artist":artist,"song":song,"img":img,"updated":now},ensure_ascii=False)+"\n",encoding="utf-8")
    print("Current song:",artist,"-",song)

if __name__=="__main__":main()
