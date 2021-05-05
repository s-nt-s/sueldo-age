from munch import Munch
from os.path import dirname
from .filemanager import FM

CFG = Munch.fromDict(FM.load("index.yml"))
