import sys
s = open(sys.argv[1], encoding='utf8').read()
stack = []; line = 1; instr = None; esc = False; i = 0
pairs = {'(': ')', '[': ']', '{': '}'}
while i < len(s):
    c = s[i]
    if c == '\n': line += 1
    if instr:
        if esc: esc = False
        elif c == '\\': esc = True
        elif c == instr: instr = None
    elif c == '/' and s[i + 1] == '/':
        i = s.index('\n', i); continue
    elif c in '"\'`': instr = c
    elif c in '([{': stack.append((c, line))
    elif c in ')]}':
        o, l = stack.pop()
        if pairs[o] != c: print('mismatch', o, 'opened line', l, 'closed by', c, 'line', line); break
    i += 1
print('unclosed:', stack[-6:], 'in string:', instr)
