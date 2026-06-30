import json, shutil

JSON_PATH = 'quiz-java.json'
BAK_PATH = 'quiz-java.json.bak'

# Backup
shutil.copy2(JSON_PATH, BAK_PATH)

with open(JSON_PATH, 'r', encoding='utf-8') as f:
    quiz = json.load(f)

questions = quiz['questions']
print(f'原始题数: {len(questions)}')

# 1. Strip A./B./C./D. prefix from choice options
fix_count = 0
for qi in questions:
    if qi['type'] == 'choice':
        opts = qi.get('options', [])
        new_opts = []
        for opt in opts:
            for prefix in ['A.', 'B.', 'C.', 'D.']:
                # Only strip if it actually starts with the letter prefix
                if opt.startswith(prefix):
                    opt = opt[len(prefix):].strip()
                    break
            new_opts.append(opt)
        if new_opts != opts:
            fix_count += 1
            qi['options'] = new_opts

print(f'修复选项前缀: {fix_count} 题')

# 2. Remove duplicates
# Normalize question text for comparison
def normalize(s):
    import re
    s = re.sub(r'\s+', ' ', s).strip()
    return s.lower()

# Find duplicates (keep first occurrence, remove later ones)
seen = {}
duplicate_indices = []
for i, qi in enumerate(questions):
    key = normalize(qi.get('question', ''))
    if key in seen:
        duplicate_indices.append(i)
        print(f'  删除重复 Q{i+1} (与 Q{seen[key]+1} 重复): {qi["question"][:50]}...')
    else:
        seen[key] = i

# Remove from back to front to preserve indices
for idx in sorted(duplicate_indices, reverse=True):
    del questions[idx]

print(f'删除重复: {len(duplicate_indices)} 题')
print(f'最终题数: {len(questions)}')

# Save
with open(JSON_PATH, 'w', encoding='utf-8') as f:
    json.dump(quiz, f, ensure_ascii=False, indent=2)

print('✅ JSON 已保存')
