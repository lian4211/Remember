#!/usr/bin/env python3
"""
Parse Java期末复习资料 raw text into quiz JSON.
Handles single-line multi-option format: "A.xxx B.yyy C.zzz D.www"
"""

import sys
import json
import re

text = sys.stdin.read()
questions = []

def add_choice(cat, q_text, opts, ans_idx):
    if q_text.strip() and opts and ans_idx >= 0:
        # Clean up option text
        clean_opts = []
        for o in opts:
            # Remove any remaining letter+dot prefixes from multi-option lines
            o = re.sub(r'^[A-D]\.\s*', '', o).strip()
            # Remove embedded option markers like "B.text" 
            o = re.sub(r'\s+[A-D]\.', '', o).strip()
            clean_opts.append(o)
        questions.append({
            "type": "choice", "category": cat,
            "question": q_text.strip(),
            "options": clean_opts, "answer": ans_idx
        })

def add_qa(cat, q_text, a_text):
    t, a = q_text.strip(), a_text.strip()
    if t and a:
        questions.append({
            "type": "qa", "category": cat,
            "question": t, "answer": a
        })

def extract_options_from_line(line):
    """Extract all options from a line like 'A.xxx B.yyy C.zzz D.www'"""
    opts = []
    # Split on pattern that looks like an option start
    parts = re.split(r'(?=[A-D]\.)', line)
    for p in parts:
        p = p.strip()
        m = re.match(r'^[A-D]\.\s*(.*)', p)
        if m:
            opts.append(m.group(1).strip())
    return opts


def parse_section(text, section_marker, category):
    start = text.find(section_marker)
    if start < 0:
        return
    
    next_markers = ['一、', '二、', '三、', '四、', '五、']
    end = len(text)
    for m in next_markers:
        pos = text.find(m, start + len(section_marker))
        if pos > start and pos < end:
            end = pos
    
    section_text = text[start:end]
    lines = section_text.split('\n')
    
    if category == '单选题':
        parse_single_choice(lines)
    elif category == '判断题':
        parse_tf(lines)
    elif category == '填空题':
        parse_fill(lines)
    elif category == '程序填空':
        parse_program_fill(lines)
    elif category == '程序编写题':
        parse_program_write(lines)


def parse_single_choice(lines):
    q_text = ""
    options = []
    answer_idx = -1
    
    def flush():
        nonlocal q_text, options, answer_idx
        if q_text and options and answer_idx >= 0:
            # Check if options were properly extracted
            if len(options) == 1 and re.search(r'[A-D]\.', options[0]):
                # Multi-option on one line, split properly
                opts = extract_options_from_line(options[0])
                if len(opts) == 4:
                    questions.append({
                        "type": "choice", "category": "单选题",
                        "question": q_text.strip(),
                        "options": opts, "answer": answer_idx
                    })
                else:
                    # Try extracting options from question text
                    all_opts = extract_options_from_line(q_text)
                    if len(all_opts) == 4:
                        q_clean = re.sub(r'\s*[A-D]\..*$', '', q_text).strip()
                        questions.append({
                            "type": "choice", "category": "单选题",
                            "question": q_clean,
                            "options": all_opts, "answer": answer_idx
                        })
            elif len(options) >= 2:
                questions.append({
                    "type": "choice", "category": "单选题",
                    "question": q_text.strip(),
                    "options": options, "answer": answer_idx
                })
        q_text = ""
        options = []
        answer_idx = -1
    
    for line in lines:
        s = line.strip()
        if not s:
            continue
        
        q_match = re.match(r'^(\d+)\.\s*(.*)', s)
        
        if q_match:
            flush()
            # Check if the question line itself contains options
            rest = q_match.group(2).strip()
            opts = extract_options_from_line(rest)
            if opts:
                q_text = re.sub(r'\s*[A-D]\..*$', '', rest).strip()
                options = opts
            else:
                q_text = rest
        
        elif re.match(r'^[A-D]\.', s):
            opts = extract_options_from_line(s)
            if opts:
                if len(opts) > 1:
                    options.extend(opts)
                else:
                    options.append(s)
        
        elif s.startswith('答案：'):
            ans_letter = s[3:].strip()
            ans_map = {'A': 0, 'B': 1, 'C': 2, 'D': 3}
            answer_idx = ans_map.get(ans_letter, -1)
        
        elif not s.startswith(('一、', '二、', '三、', '四、', '五、', '解析', '——')):
            # Check if this continuation has options
            opts = extract_options_from_line(s)
            if opts:
                options.extend(opts)
            else:
                q_text += ' ' + s
    
    flush()


def parse_tf(lines):
    q_text = ""
    answer = ""
    for line in lines:
        s = line.strip()
        q_match = re.match(r'^(\d+)\.\s*(.*)', s)
        if q_match:
            if q_text and answer:
                correct = 0 if '对' in answer else 1
                add_choice('判断题', q_text, ["正确", "错误"], correct)
            q_text = q_match.group(2).strip()
            answer = ""
        elif s.startswith('答案：'):
            answer = s[3:].strip()
        elif s and not s.startswith(('二、', '解析', '——')):
            q_text += ' ' + s
    if q_text and answer:
        correct = 0 if '对' in answer else 1
        add_choice('判断题', q_text, ["正确", "错误"], correct)


def parse_fill(lines):
    q_text = ""
    answer = ""
    for line in lines:
        s = line.strip()
        q_match = re.match(r'^(\d+)\.\s*(.*)', s)
        if q_match:
            if q_text and answer:
                add_qa('填空题', q_text, answer)
            q_text = q_match.group(2).strip()
            answer = ""
        elif s.startswith('答案：'):
            answer = s[3:].strip()
        elif s and not s.startswith(('三、', '解析', '——')):
            q_text += '\n' + s
    if q_text and answer:
        add_qa('填空题', q_text, answer)


def parse_program_fill(lines):
    in_answer = False
    q_parts = []
    a_parts = []
    current_q = False
    
    for line in lines:
        s = line.strip()
        
        if re.match(r'^(第\d+题|题目\d+)', s):
            if current_q:
                q_text = '\n'.join(q_parts).strip()
                a_text = '\n'.join(a_parts).strip()
                add_qa('程序填空', q_text, a_text)
            current_q = True
            q_parts = [s]
            a_parts = []
            in_answer = False
            
        elif s.startswith('答案：') or re.match(r'^空\d+答案', s):
            in_answer = True
            if s.startswith('答案：'):
                a_parts.append(s[3:].strip())
            elif re.match(r'^空\d+答案', s):
                m = re.search(r'答案[：:]\s*(.*)', s)
                if m:
                    a_parts.append(m.group(1).strip())
                    
        elif in_answer:
            if s and not s.startswith(('```', '第', '题目', '——', '四、')):
                a_parts.append(s)
        else:
            if s and not s.startswith(('```', '——', '四、')):
                q_parts.append(s)
    
    if current_q:
        q_text = '\n'.join(q_parts).strip()
        a_text = '\n'.join(a_parts).strip()
        add_qa('程序填空', q_text, a_text)


def parse_program_write(lines):
    in_answer = False
    q_parts = []
    a_parts = []
    current_q = False
    
    for line in lines:
        s = line.strip()
        
        if re.match(r'^习题\d+', s):
            if current_q:
                q_text = '\n'.join(q_parts).strip()
                a_text = '\n'.join(a_parts).strip()
                add_qa('程序编写题', q_text, a_text)
            current_q = True
            q_parts = [s]
            a_parts = []
            in_answer = False
            
        elif s in ('完整正确代码', '完整代码'):
            in_answer = True
        elif s == '```':
            continue
        elif s == '题目要求':
            continue
        elif in_answer:
            a_parts.append(line)
        else:
            q_parts.append(s)
    
    if current_q:
        q_text = '\n'.join(q_parts).strip()
        a_text = '\n'.join(a_parts).strip()
        add_qa('程序编写题', q_text, a_text)


# ====== Process ======
parse_section(text, '一、单选题', '单选题')
parse_section(text, '二、判断题', '判断题')
parse_section(text, '三、填空题', '填空题')
parse_section(text, '四、程序填空', '程序填空')
parse_section(text, '五、程序编写题', '程序编写题')

result = {"name": "Java期末复习资料", "questions": questions}
json.dump(result, sys.stdout, ensure_ascii=False, indent=2)
