import sys, glob
from PIL import Image
files = sorted(glob.glob(sys.argv[1] + '/*.png')); cols = int(sys.argv[3]) if len(sys.argv) > 3 else 3; s = float(sys.argv[4]) if len(sys.argv) > 4 else 0.33
ims = [Image.open(f).convert('RGB') for f in files]; w, h = ims[0].size; tw, th = int(w*s), int(h*s)
sheet = Image.new('RGB', (tw*cols, th*((len(ims)+cols-1)//cols)), 'black')
for i, im in enumerate(ims): sheet.paste(im.resize((tw, th)), ((i%cols)*tw, (i//cols)*th))
sheet.save(sys.argv[2], quality=85)
