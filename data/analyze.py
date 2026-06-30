import json
with open('quiz-java.json','r',encoding='utf-8') as f:
    quiz = json.load(f)
print('总题数:', len(quiz['questions']))
abcd_qs = []
code_qs = []
missing_ans = []
for i,q in enumerate(quiz['questions']):
    qt = q.get('question','')
    if '\n' in qt or 'class ' in qt or 'void ' in qt or 'public ' in qt or '{' in qt:
        code_qs.append(i+1)
    if q['type']=='choice':
        for opt in q.get('options',[]):
            if any(opt.startswith(p) for p in ['A.','B.','C.','D.']):
                abcd_qs.append(i+1)
                break
    if 'answer' not in q or q['answer'] is None:
        missing_ans.append(i+1)
    elif isinstance(q['answer'],int) and q['answer'] < 0:
        missing_ans.append(i+1)

print('选项含A/B/C/D前缀的题:', len(abcd_qs))
print('  题号:', abcd_qs)
print('含代码的题:', len(code_qs))
if code_qs:
    print('  题号:', code_qs)
print('缺少答案的题:', len(missing_ans))
print('  题号:', missing_ans)
print()

if abcd_qs:
    print('=== 选项带A/B/C/D前缀的示例 ===')
    for idx in abcd_qs[:5]:
        q = quiz['questions'][idx-1]
        print(f'Q{idx}: {q["question"][:60]}')
        print(f'  选项: {q["options"]}')
        print()

multi_line_qs = [i for i in code_qs if '\n' in quiz['questions'][i-1].get('question','')]
if multi_line_qs:
    print(f'=== 题目中含多行代码的题({len(multi_line_qs)}题) ===')
    for idx in multi_line_qs[:5]:
        q = quiz['questions'][idx-1]
        print(f'Q{idx}: 题干含{q["question"].count(chr(10))+1}行')
        print(q['question'][:300])
        print()
