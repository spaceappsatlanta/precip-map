'''Quick and dirty script to create json data for visualization code
   from data extracted by extract_precip.py.
'''

import cPickle as pickle

with open('precip.p') as fp:
    data = pickle.load(fp)

def main():
    #process(1, 1)
    #process(2, 2)
    process(3, 3)
    process(4, 4)

def process(w, h):
    with open('precip%dx%d.json' % (w,h), 'w') as fp:
        print >>fp, '['
        for i,(y,m,d,p) in enumerate(data):
            print w, h, y, m
            p = combine(p, w, h)
            p_str = make_list((make_list(make_float(el) for el in row)
                               for row in p), '\n')
            comma = ',' if i < len(data)-1 else ''
            print >>fp, '[%d, %d, %d, %s]%s' % (y,m,d,p_str,comma)
        print >>fp, ']'

def combine1(x,n):
    m,e = divmod(x.shape[1], n)
    if e:
        x = x[::, :-e:]
    return x.reshape(x.shape[0], m, n).mean(axis=2)

def combine(p, w, h):
    p = combine1(p, w)
    p = combine1(p.T, h)
    return p

def make_list(el, extra=''):
    return '[%s]' % (','+extra).join(el)

def make_float(f):
    if f < 0:
        return '-1'
    else:
        return '%.3f' % (f,)

__name__ == '__main__' and main()
