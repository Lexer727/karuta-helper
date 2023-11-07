import json
import os

filename = 'wishlistv2.txt'

# v1 wl anime name, v2 wl name anime
fields = ['wl', 'name', 'anime']
res = []

with open(filename, 'r', encoding='utf-8-sig') as f:
    for line in f:
        entry = [x.replace('\u2764\ufe0f','').strip() for x in line.split('·')]
        entry.pop(0)
        entry[0] = '❤️ ' + entry[0]
        entry[2].replace('.','')

        print(entry)

        i = 0
        dict2 = {}
        while i<len(fields):
            dict2[fields[i]] = entry[i]
            i = i + 1
        res.append(dict2)

out_file = open("wldata.json", "w")
json.dump(res, out_file, indent=2)
out_file.close()