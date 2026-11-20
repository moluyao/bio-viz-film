import sys, glob
from PIL import Image
files = sorted(glob.glob(sys.argv[1] + '/*.png')); cols = int(sys.argv[3]) if len(sys.argv) > 3 else 4
crop = (16, 196, 1064, 896)  # stage area only
ims = [Image.open(f).convert('RGB').crop(crop) for f in files]
w, h = ims[0].size; s = 0.5
sheet = Image.new('RGB', (int(w*s)*cols, int(h*s)*((len(ims)+cols-1)//cols)), 'white')
for i, im in enumerate(ims): sheet.paste(im.resize((int(w*s), int(h*s))), ((i%cols)*int(w*s), (i//cols)*int(h*s)))
sheet.save(sys.argv[2], quality=85)
