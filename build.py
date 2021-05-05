#!/usr/bin/env python3

from os.path import abspath, dirname
from os import chdir
import logging
import argparse
from core.retribuciones import Retribuciones
from core.muface import Muface
from core.rpt import RPT
from core.j2 import Jnj2
from math import ceil
import bs4

abspath = abspath(__file__)
dname = dirname(abspath)
chdir(dname)

logging.basicConfig(
    level=logging.INFO,
    #format='%(asctime)s - %(levelname)s - %(message)s',
    format='%(levelname)s %(message)s',
    datefmt='%d-%b-%y %H:%M:%S'
)

def minmax(arr):
    arr=list(map(float, arr))
    r={
        "min":int(min(arr)),
        "max":ceil(max(arr))
    }
    return r

rt=Retribuciones()
r=rt.get(2021)
mf=Muface()
m=mf.get(2021)
rp=RPT()
t=rp.get()

sueldo=set()
extra=set()
especifico=set()
for k, v in r.items():
    if isinstance(v, dict) and "base" in v:
        sueldo.add(v["base"]["sueldo"])
        extra.add(v["junio"]["sueldo"])
        extra.add(v["diciembre"]["sueldo"])

def post_render(html, **kwargs):
    soup = bs4.BeautifulSoup(html, 'lxml')
    for i in soup.findAll(["input", "select"]):
        id = i.attrs.get("id")
        if "name" not in i.attrs:
            i.attrs["name"]=id
    return str(soup)

j = Jnj2("template/", "docs/", post=post_render)
j.create_script("rec/js/00-data.js",
    muface=m,
    retribuciones=r
)
j.save("index.html",
    rpt=minmax(t.keys()),
    nivel=minmax(r["niveles"].keys()),
    sueldo=minmax(sueldo),
    extra=minmax(extra),
    muface=minmax(m.values()),
    cdestino=minmax(r["niveles"].values()),
    especifico=minmax(p["complemento"] for p in t.values())
)
