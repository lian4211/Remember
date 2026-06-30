// ==================== Java 程序题练习模块 ====================
// 独立于 quiz 系统，不影响现有题库

// 练习数据
const exerciseData = {
  "flow": {
    title: "流程控制",
    subtitle: "循环与条件 — while、for、if、break",
    exercises: [
      {
        name: "密码验证（while 版）",
        detail: "最多输入3次密码，正确则进入，全部错误则退出",
        code: `import java.util.Scanner;

public class PwdWhileDemo {
    public static void main(String[] args) throws InterruptedException {
        Scanner sc = new Scanner(System.in);
        String rightPwd = "jsu12345";
        int count = 0;
        while(count < 3) {
            System.out.println("请输入用户密码：");
            String input = sc.next();
            if(input.equals(rightPwd)) {
                System.out.println("输入密码与设置密码一致，可以进入系统啦！");
                break;
            } else {
                count++;
                int left = 3 - count;
                System.out.println("输入密码与设置密码不一致，请重新输入密码！");
                if(left > 0) {
                    System.out.println("你还有 " + left + " 次机会输入密码");
                }
            }
        }
        if(count == 3) {
            System.out.println("密码连续错误3次，5秒后退出系统...");
            Thread.sleep(5000);
            System.out.println("系统已退出");
        }
        sc.close();
    }
}`,
        blanks: [
          { line: 8, answer: "while(count < 3)", hint: "循环条件（最多3次）" },
          { line: 11, answer: "input.equals(rightPwd)", hint: "字符串比较方法" },
          { line: 13, answer: "break", hint: "跳出循环关键字" },
          { line: 23, answer: "count == 3", hint: "判定是否3次全错" },
          { line: 25, answer: "Thread.sleep(5000)", hint: "暂停5秒的方法" }
        ]
      },
      {
        name: "密码验证（for 版）",
        detail: "用 for 循环实现同样的逻辑，对比两种循环写法",
        code: `import java.util.Scanner;

public class PwdForDemo {
    public static void main(String[] args) throws InterruptedException {
        Scanner sc = new Scanner(System.in);
        String rightPwd = "jsu12345";
        boolean flag = false;
        for(int i = 0; i < 3; i++) {
            System.out.println("请输入用户密码：");
            String input = sc.next();
            if(input.equals(rightPwd)) {
                System.out.println("输入密码与设置密码一致，可以进入系统啦！");
                flag = true;
                break;
            } else {
                int left = 2 - i;
                System.out.println("输入密码与设置密码不一致，请重新输入密码！");
                if(left > 0) {
                    System.out.println("你还有 " + left + " 次机会输入密码");
                }
            }
        }
        if(!flag) {
            System.out.println("密码连续错误3次，5秒后退出系统...");
            Thread.sleep(5000);
            System.out.println("系统已退出");
        }
        sc.close();
    }
}`,
        blanks: [
          { line: 8, answer: "for(int i = 0; i < 3; i++)", hint: "for循环格式" },
          { line: 11, answer: "input.equals(rightPwd)", hint: "字符串相等判断" },
          { line: 13, answer: "flag = true", hint: "标记成功" },
          { line: 16, answer: "2 - i", hint: "计算剩余次数" }
        ]
      }
    ],
    tips: [
      "字符串比较用 .equals() 而不是 ==",
      "while 适用不确定次数；for 适用确定次数",
      "break 立即跳出当前循环",
      "Thread.sleep(毫秒) 让程序暂停"
    ]
  },
  "class": {
    title: "类定义",
    subtitle: "封装、构造方法、继承、抽象类、多态",
    exercises: [
      {
        name: "Person 基础类",
        detail: "封装：private属性 + getter/setter + 构造方法",
        code: `public class Person {
    private String name;
    private int age;
    private char sex;

    // 获取姓名
    public String getName() {
        return name;
    }
    // 设置姓名
    public void setName(String aName) {
        this.name = aName;
    }
    // 输出姓名
    public void printPerson() {
        System.out.println(name);
    }
}

// 测试类
public class Demo {
    public static void main(String[] args) {
        Person swk = new Person();
        swk.setName("孙悟空");
        swk.printPerson();
    }
}`,
        blanks: [
          { line: 1, answer: "private String name;", hint: "私有成员变量" },
          { line: 6, answer: "public String getName()", hint: "getter命名规范" },
          { line: 10, answer: "public void setName(String aName)", hint: "setter有参数" },
          { line: 11, answer: "this.name = aName;", hint: "this区分成员变量和参数" },
          { line: 18, answer: "new Person()", hint: "new创建对象" }
        ]
      },
      {
        name: "Student 静态变量类",
        detail: "静态变量（类变量）+ 多构造方法",
        code: `public class Student {
    // 私有成员
    private String name;
    private int age;
    private char sex;
    // 公共静态常量
    public static String school = "吉首大学";
    // 空构造
    public Student() {}
    // name、age构造
    public Student(String name, int age) {
        this.name = name;
        this.age = age;
    }
    // get set
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public int getAge() { return age; }
    public void setAge(int age) { this.age = age; }
    public char getSex() { return sex; }
    public void setSex(char sex) { this.sex = sex; }
    // 输出全部信息
    public void getStudent() {
        System.out.println("姓名："+name+"，年龄："+age+"，性别："+sex+"，学校："+school);
    }
}

// 测试类
public class Demo {
    public static void main(String[] args) {
        Student t1 = new Student("张三", 22);
        t1.setSex('男');
        t1.getStudent();
    }
}`,
        blanks: [
          { line: 7, answer: "public static String school = \"吉首大学\"", hint: "static: 类变量，所有对象共享" },
          { line: 9, answer: "public Student() {}", hint: "空构造方法（无参）" },
          { line: 11, answer: "public Student(String name, int age)", hint: "有参构造方法" },
          { line: 29, answer: "Student t1 = new Student(\"张三\", 22)", hint: "用有参构造创建" }
        ]
      },
      {
        name: "Animal 抽象类多态",
        detail: "abstract 类 → 子类重写 → 多态调用",
        code: `// 抽象动物类
public abstract class Animal {
    private String name;
    public Animal() {}
    public Animal(String name) { this.name = name; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    // 抽象进食方法
    abstract public void eating(String food);
}

// 牛子类
public class Cow extends Animal {
    private String color;
    public Cow() {}
    public Cow(String name, String color) {
        super(name);
        this.color = color;
    }
    @Override
    public void eating(String food) {
        System.out.println(this.getName() + "在咀嚼：" + food);
    }
}

// 蛇子类
public class Snake extends Animal {
    private double length;
    public Snake() {}
    public Snake(String name, double length) {
        super(name);
        this.length = length;
    }
    @Override
    public void eating(String food) {
        System.out.println(this.getName() + "在吞食：" + food);
    }
}

// 测试类
public class Living {
    public void toEating(Animal animal, String food) {
        animal.eating(food);
    }
    public static void main(String[] args) {
        Living live = new Living();
        live.toEating(new Cow("奶牛", "黑白"), "饲料");
        live.toEating(new Snake("非洲蟒蛇", 6.8), "小牛");
    }
}`,
        blanks: [
          { line: 1, answer: "public abstract class Animal", hint: "abstract修饰类" },
          { line: 11, answer: "abstract public void eating(String food)", hint: "抽象方法无方法体" },
          { line: 16, answer: "public class Cow extends Animal", hint: "extends继承" },
          { line: 20, answer: "super(name)", hint: "调用父类构造" },
          { line: 45, answer: "Animal animal", hint: "多态：父类型引用" }
        ]
      }
    ],
    tips: [
      "private 属性 + public getter/setter = 封装",
      "static 成员属于类，所有对象共享同一份",
      "abstract 类不能 new，必须由子类继承并实现抽象方法",
      "super(参数) 调用父类构造，必须在子类构造的第一行",
      "多态：父类引用指向子类对象，调用的是子类重写的方法"
    ]
  },
  "interface": {
    title: "接口",
    subtitle: "interface 定义、implements 实现、多态",
    exercises: [
      {
        name: "Graph 图形接口",
        detail: "接口定义 → 三类图形实现 → 统一多态调用",
        code: `// 图形接口
public interface Graph {
    void drawing();
}

// 圆形
public class Circle implements Graph {
    private double radius;
    public Circle(double radius) { this.radius = radius; }
    @Override
    public void drawing() {
        System.out.println("画一个圆，半径：" + radius);
    }
}

// 矩形
public class Rectangle implements Graph {
    private double length, width;
    public Rectangle(double length, double width) {
        this.length = length;
        this.width = width;
    }
    @Override
    public void drawing() {
        System.out.println("画一个长方形，长："+length+"，宽："+width);
    }
}

// 三角形
public class Triangle implements Graph {
    private double a,b,c;
    public Triangle(double a, double b, double c) {
        this.a = a; this.b = b; this.c = c;
    }
    @Override
    public void drawing() {
        System.out.println("画一个三角形，三边："+a+","+b+","+c);
    }
}

// 客户端
public class Client {
    public void myDrawing(Graph g) {
        g.drawing();
    }
}

// 测试入口
public class Demo {
    public static void main(String[] args) {
        Client c = new Client();
        c.myDrawing(new Rectangle(10, 5));
        c.myDrawing(new Circle(5));
        c.myDrawing(new Triangle(3,4,5));
    }
}`,
        blanks: [
          { line: 1, answer: "public interface Graph", hint: "interface关键字" },
          { line: 2, answer: "void drawing();", hint: "接口方法自动public abstract" },
          { line: 6, answer: "public class Circle implements Graph", hint: "implements实现接口" },
          { line: 9, answer: "@Override", hint: "重写注解" },
          { line: 39, answer: "Graph g", hint: "接口类型接收实现类对象（多态）" }
        ]
      },
      {
        name: "Person + ITask 综合",
        detail: "继承 + 接口同时使用，最复杂的综合题",
        code: `// 父类 Person
public class Person {
    private String name, sex; private int age;
    public Person(String name, char sex, int age) {
        this.name = name; this.sex = sex; this.age = age;
    }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public char getSex() { return sex; }
    public int getAge() { return age; }
    public void saying(Person per, String msg) {
        System.out.println(this.name + "对" + per.getName() + "说：\"" + msg + "\"");
    }
}

// 任务接口
public interface ITask {
    void working();
    void rest();
    void show();
}

// 学生类 — 同时继承 Person 和实现 ITask
public class Student extends Person implements ITask {
    private String id;
    public Student(String name, char sex, int age, String id) {
        super(name, sex, age);
        this.id = id;
    }
    @Override public void working() { System.out.println(this.getName()+"正在学习。"); }
    @Override public void rest() { System.out.println(this.getName()+"正在休息。"); }
    @Override public void show() {
        System.out.println("姓名："+this.getName()+"，性别："+this.getSex()+"，学号："+this.id);
    }
    public void reading(String book) { System.out.println(this.getName()+"读："+book); }
}

// 教师类
public class Teacher extends Person implements ITask {
    private String department;
    public Teacher(String name, char sex, int age, String dept) {
        super(name, sex, age); this.department = dept;
    }
    @Override public void working() { System.out.println(this.getName()+"正在上课。"); }
    @Override public void rest() { System.out.println(this.getName()+"正在休息。"); }
    @Override public void show() {
        System.out.println("姓名："+this.getName()+"，部门："+this.department);
    }
    public void teaching(Student std, String course) {
        System.out.println(this.getName()+"向"+std.getName()+"讲授"+course);
    }
}

// 测试
public class Demo {
    public static void main(String[] args) {
        Student sun = new Student("孙悟空", '男', 22, "190010987");
        Teacher tang = new Teacher("唐僧", '男', 26, "国学系");
        System.out.println("----------测试Student类----------");
        sun.show();
        sun.reading("西游记");
        sun.working(); sun.rest();
        sun.saying(tang, "师傅你注意安全，俺老孙去去就回。");
        System.out.println("----------测试Teacher类----------");
        tang.teaching(sun, "除妖记");
        tang.show();
        tang.saying(sun, "悟空你又调皮了！");
    }
}`,
        blanks: [
          { line: 23, answer: "public class Student extends Person implements ITask", hint: "同时继承和实现" },
          { line: 26, answer: "super(name, sex, age)", hint: "调用父类构造" },
          { line: 64, answer: "Student sun = new Student(\"孙悟空\", '男', 22, \"190010987\")", hint: "带学号的构造函数" }
        ]
      }
    ],
    tips: [
      "interface 只声明方法签名（JDK8之前），不写方法体",
      "implements 关键字实现接口",
      "一个类可以 implements 多个接口，但只能 extends 一个父类",
      "接口变量默认 public static final（常量）",
      "接口方法默认 public abstract"
    ]
  }
};

// ==================== 状态 ====================
let exState = {
  type: null,       // 'flow' | 'class' | 'interface'
  exIndex: 0,       // 当前第几个练习
  blankMode: false,  // 填空模式
  revealed: {},      // 已揭开的行 { lineNum: true }
  page: 1            // 1=列表页 2=代码页
};

// ==================== 渲染 ====================
function escEx(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

/** 渲染列表页 */
export function renderJavaExerciseList() {
  // 如果从首页直接跳转到指定分类
  if (window._jStart && exerciseData[window._jStart]) {
    const type = window._jStart;
    window._jStart = null;
    openExerciseList(type);
    return;
  }

  const container = document.getElementById('java-exercise-list-container');
  if (!container) return;
  document.getElementById('java-exercise-detail-area').style.display = 'none';
  container.style.display = 'block';

  container.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:0.75rem">
      ${['flow','class','interface'].map(type => {
        const d = exerciseData[type];
        return `<div class="app-card" style="padding:1rem;cursor:pointer" onclick="window._openJavaExercise('${type}')">
          <div style="display:flex;justify-content:space-between;align-items:flex-start">
            <div>
              <p style="font-weight:700;font-size:1rem">${d.title}</p>
              <p style="color:var(--text-secondary);font-size:0.8125rem;margin-top:0.25rem">${d.subtitle}</p>
              <p style="color:var(--text-muted);font-size:0.75rem;margin-top:0.25rem">${d.exercises.length} 道练习</p>
            </div>
            <span style="font-size:1.5rem">${type==='flow'?'🔄':type==='class'?'📦':'🔌'}</span>
          </div>
        </div>`;
      }).join('')}
    </div>
    <p style="text-align:center;color:var(--text-muted);margin-top:1rem;font-size:0.8125rem">
      提示：切换"填空模式"可以隐藏关键代码行，训练补全能力
    </p>`;

  window._openJavaExercise = (type) => openExerciseList(type);
}

/** 打开一个类别下的练习列表 */
function openExerciseList(type) {
  const d = exerciseData[type];
  exState.type = type;
  exState.page = 2;

  document.getElementById('java-exercise-list-container').style.display = 'none';
  const area = document.getElementById('java-exercise-detail-area');
  area.style.display = 'block';
  area.innerHTML = `
    <button id="java-ex-back" class="btn-ghost" style="margin-bottom:0.75rem">← 返回列表</button>
    <h2 style="font-weight:700;font-size:1.125rem;margin-bottom:0.25rem">${d.title}</h2>
    <p style="color:var(--text-secondary);font-size:0.875rem;margin-bottom:1rem">${d.subtitle}</p>
    ${d.exercises.map((ex, i) => `
      <div class="app-card" style="padding:1rem;margin-bottom:0.75rem;cursor:pointer" onclick="window._openJavaCode(${i})">
        <p style="font-weight:600">${ex.name}</p>
        <p style="color:var(--text-secondary);font-size:0.8125rem;margin-top:0.25rem">${ex.detail}</p>
      </div>
    `).join('')}
    <div class="app-card" style="padding:0.75rem;margin-top:1rem;background:var(--primary-bg)">
      <p style="font-weight:600;font-size:0.875rem;margin-bottom:0.5rem">💡 关键提示</p>
      ${d.tips.map(t => `<p style="font-size:0.8125rem;color:var(--text-secondary);margin-bottom:0.25rem">· ${t}</p>`).join('')}
    </div>`;

  document.getElementById('java-ex-back').addEventListener('click', renderJavaExerciseList);
  
  // 更新标题
  const title = document.getElementById('page-title');
  if (title) title.textContent = 'Java练习 · ' + d.title;
}

/** 渲染代码页 */
window._openJavaCode = function(idx) {
  const d = exerciseData[exState.type];
  const ex = d.exercises[idx];
  exState.exIndex = idx;
  exState.revealed = {};
  exState.blankMode = false;

  const area = document.getElementById('java-exercise-detail-area');
  renderCodePage(area, ex);
};

function renderCodePage(area, ex) {
  const lines = ex.code.split('\n');
  
  area.innerHTML = `
    <button id="java-ex-back2" class="btn-ghost" style="margin-bottom:0.5rem">← 返回</button>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem">
      <div>
        <h2 style="font-weight:700;font-size:1rem">${ex.name}</h2>
        <p style="color:var(--text-secondary);font-size:0.8125rem">${ex.detail}</p>
      </div>
      <button id="java-toggle-blank" class="btn-ghost" style="font-size:0.8125rem;white-space:nowrap">
        ${exState.blankMode ? '📄 完整代码' : '✏️ 填空模式'}
      </button>
    </div>
    <div class="java-code-block" id="java-code-container">
      ${renderCodeLines(lines, ex.blanks)}
    </div>
    <div style="margin-top:0.75rem;display:flex;gap:0.5rem">
      <button id="java-reveal-all" class="btn-primary" style="flex:1;font-size:0.875rem">👁 显示全部答案</button>
      <button id="java-reset-blank" class="btn-ghost" style="font-size:0.875rem">🔄 重置</button>
    </div>`;

  document.getElementById('java-ex-back2').addEventListener('click', () => openExerciseList(exState.type));
  document.getElementById('java-toggle-blank').addEventListener('click', () => toggleBlankMode(ex, area));
  document.getElementById('java-reveal-all').addEventListener('click', () => revealAll(ex, area));
  document.getElementById('java-reset-blank').addEventListener('click', () => {
    exState.revealed = {};
    renderCodePage(area, ex);
  });

  // 更新标题
  const title = document.getElementById('page-title');
  if (title) title.textContent = 'Java练习 · ' + ex.name;

  // 点击填空行揭开
  document.querySelectorAll('.java-blank-line').forEach(el => {
    el.addEventListener('click', () => {
      const ln = parseInt(el.dataset.line);
      exState.revealed[ln] = true;
      renderCodePage(area, ex);
    });
  });
}

function renderCodeLines(lines, blanks) {
  const blankMap = {};
  (blanks || []).forEach(b => { blankMap[b.line] = b; });

  return lines.map((line, i) => {
    const ln = i + 1;
    const blank = blankMap[ln];
    const isBlank = blank && exState.blankMode;
    const revealed = exState.revealed[ln];

    if (isBlank && !revealed) {
      // 填空模式：显示带提示的空
      const content = line.trim();
      const blanked = content.replace(/\S+$/, '________');
      return `<div class="java-blank-line" data-line="${ln}" style="display:flex;gap:0.5rem;align-items:center;padding:0.125rem 0;cursor:pointer">
        <span class="java-line-num">${ln}</span>
        <span class="java-line-content" style="text-decoration-style:wavy">${escEx(blanked)}</span>
        <span class="blank-hint">💡 ${escEx(blank.hint)}</span>
      </div>`;
    }

    if (isBlank && revealed) {
      // 已揭开：显示答案高亮
      return `<div class="java-blank-line revealed" style="display:flex;gap:0.5rem;align-items:center;padding:0.125rem 0">
        <span class="java-line-num">${ln}</span>
        <span class="java-line-content" style="background:#d4edda;border-radius:3px;padding:0 0.25rem">${escEx(line)}</span>
        <span class="blank-hint" style="color:var(--success)">✅ ${escEx(blank.answer)}</span>
      </div>`;
    }

    // 普通行
    let cls = '';
    if (/^\s*\/\//.test(line)) cls = 'java-comment';
    else if (/\b(public|private|protected|class|interface|extends|implements|abstract|static|final|void|int|double|char|boolean|String|new|return|if|else|for|while|break|import|package|throws|super|this|@Override)\b/.test(line)) cls = 'java-keyword';

    return `<div style="display:flex;gap:0.5rem;align-items:center;padding:0.125rem 0">
      <span class="java-line-num">${ln}</span>
      <span class="java-line-content ${cls}">${escEx(line)}</span>
    </div>`;
  }).join('');
}

function toggleBlankMode(ex, area) {
  exState.blankMode = !exState.blankMode;
  exState.revealed = {};
  renderCodePage(area, ex);
}

function revealAll(ex, area) {
  (ex.blanks || []).forEach(b => { exState.revealed[b.line] = true; });
  renderCodePage(area, ex);
}
