import pandas as pd

wlfile = 'wishlistv2.txt'
csvfile = 'data.csv'

df = pd.read_csv(csvfile)

with open(wlfile, 'r', encoding='utf-8-sig') as f:
    for line in f:
        entry = [x.replace('\u2764\ufe0f','').strip() for x in line.split('·')]
        entry.pop(0)
        entry[0] = '❤️ ' + entry[0]
        entry[2].replace('.','')

        df.loc[df['Character'].str.contains(entry[1]) & df['Series'].str.contains(entry[2]), 'Wishlist'] = entry[0]
    
df.to_csv('datawl.csv', index=False)  