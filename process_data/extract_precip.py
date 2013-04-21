'''Quick and dirty script to extract "surfacePrecipitation" field from HDF
   files from the FTP archive. Creates a pickle in "precip.p" with the extracted
   data.
'''

from shutil import copy
import random
import string
import os
import re
import cPickle as pickle
import hashlib
import numpy as np
from pyhdf.SD import *
from hlab.pathutils import FilePath

acc = []
my_dir = FilePath(__file__).parent()
suffix = '.7.HDF.Z'
paths = sorted(my_dir.glob('disc2.nascom.nasa.gov/ftp/data/s4pa/*/*/*/*/*' + suffix))

def save():
    print 'saving'
    acc.sort()
    with open('precip.p', 'w') as fp:
        pickle.dump(acc, fp, pickle.HIGHEST_PROTOCOL)

last_year = None
for path in paths:

    name = path.basename()[:-len(suffix):]
    _, datastr = name.split('.')
    m = re.match('(\d{4})(\d{2})(\d{2})', datastr)
    assert m
    year, month, day = map(int, m.groups())
    assert day == 1

    tmp_path = '/tmp/rain%s.HDF' % (''.join(random.choice(string.letters + string.digits)
                                            for _ in xrange(8)))
    tmp_path_Z = tmp_path + '.Z'


    try:
        os.unlink(tmp_path_Z)
    except OSError,e:
        pass
    try:
        os.unlink(tmp_path)
    except OSError,e:
        pass

    with open(path, 'r') as in_fp:
        with open(tmp_path_Z, 'w') as out_fp:
            out_fp.write(in_fp.read())
    os.system('gunzip -f ' + tmp_path_Z)

    #m = hashlib.md5()
    #m.update(open(tmp_path).read())
    #print 'tmp_path', tmp_path, m.hexdigest()

    sd = SD(tmp_path, SDC.READ)
    kt = sd.select('surfacePrecipitation')
    print kt.dimensions()
    data = kt[:, :].copy()

    print year, month, day, data.mean()

    acc.append([year, month, day, data])

    if year != last_year:
        save()

    last_year = year
save()



