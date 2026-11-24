# Flags code hidden behind a // comment: a line comment followed by something that looks like a statement.
import re, sys
for f in sys.argv[1:]:
    for i, l in enumerate(open(f, encoding='utf8'), 1):
        m = re.search(r'(?<![:"\'])//(.*)$', l)
        if m and re.search(r'\w\s*\(.*\)\s*;|\w+\.\w+\s*=|\bconst\b|\blet\b', m.group(1)):
            print(f'{f}:{i}: {m.group(1)[:120]}')
