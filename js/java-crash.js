// ==================== Java速成知识中心 ====================
// 独立模块：C++对照表 + 知识点总结 + 思维导图 + 代码模式库

function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

// ===== C++ vs Java 对照表 =====
function renderCPPComparison() {
  const rows = [
    ["平台", "编译为机器码，平台相关", "编译为字节码，JVM解释执行（跨平台）", "一次编译到处运行"],
    ["内存管理", "手动 new/delete，易内存泄漏", "自动 GC，不需手动释放", "不用担心指针"],
    ["指针", "支持原生指针 * 和引用 &", "无指针（引用即对象句柄，类似C++指针）", "引用就是\"托管指针\""],
    ["多重继承", "class C : public A, public B {}", "只能 extends 一个类，可用 implements 多个接口", "用接口取代多重继承"],
    ["运算符重载", "支持 operator+ 等", "不支持（仅String天然支持+拼接）", "不要尝试重载=="],
    ["字符串", "std::string / char*", "String（对象），比较用 .equals()", "== 比较引用，equals 比较内容"],
    ["虚函数/多态", "virtual 关键字声明虚函数", "默认就是虚函数（除 static/private/final）", "所有非 static 方法默认多态"],
    ["析构函数", "~ClassName()", "无析构（有 finalize() 但不推荐）", "不需要释放资源"],
    ["命名空间", "namespace X { }", "package com.example;", "包名对应目录结构"],
    ["头文件", "#include <header>", "import java.util.Scanner;", "import 而非 include"],
    ["main函数", "int main(int argc, char* argv[])", "public static void main(String[] args)", "必须在类中，必须是 static"],
    ["常量", "const int MAX = 100;", "final int MAX = 100;", "final 取代 const"],
    ["布尔类型", "bool (true/false)，可用int", "boolean (true/false)，不能与int混用", "0/1 不能当 boolean"],
    ["数组", "int arr[5];", "int[] arr = new int[5];", "数组是对象，有 .length 属性"]
  ];

  return `<div class="app-card" style="padding:1rem;margin-bottom:1rem">
    <h3 style="font-weight:700;margin-bottom:0.75rem;font-size:1rem">🔀 C++ vs Java 快速对照</h3>
    <div style="overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;font-size:0.8125rem">
        <thead>
          <tr style="background:var(--primary-bg)">
            <th style="padding:0.5rem;text-align:left;font-weight:700;border-bottom:2px solid var(--border)">概念</th>
            <th style="padding:0.5rem;text-align:left;font-weight:700;border-bottom:2px solid var(--border)">C++</th>
            <th style="padding:0.5rem;text-align:left;font-weight:700;border-bottom:2px solid var(--border)">Java</th>
            <th style="padding:0.5rem;text-align:left;font-weight:700;border-bottom:2px solid var(--border)">🔥 记忆点</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((r,i) => `<tr style="border-bottom:1px solid var(--border);${i%2?'background:var(--bg)':''}">
            <td style="padding:0.5rem;font-weight:600;white-space:nowrap">${r[0]}</td>
            <td style="padding:0.5rem;color:var(--text-secondary);font-size:0.75rem">${r[1]}</td>
            <td style="padding:0.5rem;color:var(--primary);font-weight:500">${r[2]}</td>
            <td style="padding:0.5rem;font-size:0.75rem;color:var(--warning)">${r[3]}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>`;
}

// ===== 知识点卡片 =====
const knowledgeTopics = [
  {
    icon: "🔒", title: "final 关键字",
    emoji: "🔒",
    summary: "最终、不可变 — 类不可继承、方法不可重写、变量不可修改",
    points: [
      "final class → 不能被继承（如 String 类）",
      "final 方法 → 子类不能重写（但可以重载）",
      "final 变量 → 赋值后不可修改（基本类型值不变，引用类型地址不变）",
      "final 可以修饰局部变量",
      "C++ 对照：C++ 没有直接等价物（const 最接近）"
    ],
    traps: ["final 方法 ≠ 不能重载", "final 类和 abstract 类互斥（不能同时修饰）"]
  },
  {
    icon: "📝", title: "abstract 抽象类",
    emoji: "📝",
    summary: "不能实例化、可含抽象方法 — 为子类定义模板",
    points: [
      "abstract class → 不能 new 实例化",
      "abstract 方法 → 无方法体（只有声明没有 {}）",
      "子类继承 abstract 类 → 必须实现所有抽象方法，否则子类也是 abstract",
      "abstract 类可以包含普通方法（有方法体）和构造方法",
      "abstract 和 static 不能同时修饰方法（static 方法可直接调用，abstract 没有实现）"
    ],
    traps: ["abstract 类可以没有抽象方法", "abstract 类有构造方法，供子类 super() 调用"]
  },
  {
    icon: "🔌", title: "interface 接口",
    emoji: "🔌",
    summary: "纯抽象规范 — 定义行为契约，不关心实现",
    points: [
      "interface 定义：interface MyInterface { }",
      "JDK8之前：只能有抽象方法（默认 public abstract）和常量（默认 public static final）",
      "JDK8新增：default 方法（有方法体）、static 方法",
      "一个类可以 implements 多个接口（解决多继承问题）",
      "接口可以 extends 多个接口"
    ],
    traps: ["接口变量都是 public static final（常量）", "接口方法默认 public abstract（写不写都一样）", "接口不能有构造方法"]
  },
  {
    icon: "📦", title: "static 静态",
    emoji: "📦",
    summary: "类级别 — 属于类而非对象，所有实例共享",
    points: [
      "static 变量 → 类变量，所有对象共享同一份，类加载时初始化",
      "static 方法 → 可直接用 类名.方法名() 调用",
      "static 方法 → 不能访问实例变量（还没有 this）",
      "实例方法 → 可以访问静态变量和静态方法",
      "static 代码块 → 类加载时执行一次，不是每次创建对象"
    ],
    traps: ["main 方法不能直接调用非静态方法（需先 new 对象）", "静态代码块 ≠ 构造代码块"]
  },
  {
    icon: "📊", title: "数组",
    emoji: "📊",
    summary: "对象类型 — 下标从0开始，有 .length 属性",
    points: [
      "声明：int[] arr 或 int arr[]（C++风格）",
      "创建：int[] arr = new int[5]; 声明时不能指定长度",
      "初始化：int[] arr = {1,2,3};",
      "二维：int[][] arr = new int[3][4]; 或 {{1,2},{3,4,5}} 变长",
      "arr.length 获取长度（属性不是方法）",
      "下标越界 → ArrayIndexOutOfBoundsException",
      "对象类型数组元素默认值是 null"
    ],
    traps: ["arr.length 没有括号", "声明时不能 int a[5]（C++写法非法）"]
  },
  {
    icon: "🧮", title: "运算符与表达式",
    emoji: "🧮",
    summary: "位运算、取模、字符串拼接 — 注意类型转换",
    points: [
      "<< 左移：2<<3 = 2×2³ = 16",
      ">> 右移：16>>2 = 16/2² = 4",
      "& 位与：5&6 = 101 & 110 = 100 = 4",
      "% 取模：5%2 = 1（支持浮点数 20.3%5 = 0.3）",
      "char 运算：'1'+'2' = 49+50 = 99（先转int）",
      "字符串连接：\"\"+3+4 = \"34\"（不是7）",
      "37/10f = 3.7（f后缀表示float）",
      "int x=12345L → 编译错误（long不能赋给int）"
    ],
    traps: ["浮点数精度丢失：(0.05+0.01) != 0.06", "= 是赋值，== 是相等判断"]
  },
  {
    icon: "🎯", title: "多态与重写",
    emoji: "🎯",
    summary: "父类引用指向子类对象，调用子类重写的方法",
    points: [
      "重写（Override）：子类重新定义父类方法，参数列表相同",
      "重载（Overload）：同一类中多个同名方法，参数列表不同（类型/个数）",
      "多态表现形式：重写（不是重载/继承/封装）",
      "重写时返回类型可以是子类型（协变返回类型）"
    ],
    traps: ["返回值类型不同不能作为重载区分条件", "重写不等于重载"]
  }
];

function renderKnowledgeCards() {
  return `<div style="margin-bottom:1rem">
    <h3 style="font-weight:700;margin-bottom:0.75rem;font-size:1rem">📚 高频知识点速记</h3>
    <div style="display:flex;flex-direction:column;gap:0.5rem">
      ${knowledgeTopics.map(t => `
        <div class="knowledge-card" onclick="this.classList.toggle('expanded')">
          <div class="kc-header">
            <span style="font-size:1.25rem">${t.icon}</span>
            <span style="font-weight:700">${t.title}</span>
            <span style="margin-left:auto;font-size:0.75rem;color:var(--text-muted)">▼</span>
          </div>
          <p class="kc-summary">${t.summary}</p>
          <div class="kc-body">
            <ul style="margin:0;padding-left:1.25rem;font-size:0.8125rem;color:var(--text-secondary)">
              ${t.points.map(p => `<li style="margin-bottom:0.25rem">${p}</li>`).join('')}
            </ul>
            <div style="margin-top:0.5rem;padding:0.5rem;background:var(--warning-bg);border-radius:4px">
              <p style="font-size:0.75rem;font-weight:600;color:var(--warning);margin-bottom:0.25rem">⚠️ 常见陷阱</p>
              ${t.traps.map(tr => `<p style="font-size:0.75rem;color:var(--text);margin:0">· ${tr}</p>`).join('')}
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  </div>`;
}

// ===== 思维导图（关系图） =====
function renderMindMap() {
  return `<div class="app-card" style="padding:1rem;margin-bottom:1rem">
    <h3 style="font-weight:700;margin-bottom:0.75rem;font-size:1rem">🧠 核心关系速览</h3>
    <div style="font-size:0.8125rem;line-height:1.8">
      <div style="border-left:3px solid var(--primary);padding-left:0.75rem;margin-bottom:0.75rem">
        <p style="font-weight:700;color:var(--primary);margin-bottom:0.25rem">类（class）</p>
        <p>├─ <span style="color:var(--info);font-weight:600">普通类</span> → 可以 new，可含所有方法</p>
        <p>├─ <span style="color:var(--warning);font-weight:600">final 类</span> → 不能有子类（不能被 extends）</p>
        <p>├─ <span style="color:var(--danger);font-weight:600">abstract 类</span> → 不能 new，必须有子类实现</p>
        <p>│&nbsp;&nbsp;&nbsp;├─ extends 继承（单继承）</p>
        <p>│&nbsp;&nbsp;&nbsp;└─ 子类必须实现所有 abstract 方法</p>
      </div>
      <div style="border-left:3px solid var(--success);padding-left:0.75rem;margin-bottom:0.75rem">
        <p style="font-weight:700;color:var(--success);margin-bottom:0.25rem">接口（interface）</p>
        <p>├─ 只能有：抽象方法 + 常量（JDK8之前）</p>
        <p>├─ extends 多继承接口（interface A extends B, C）</p>
        <p>├─ implements 实现接口（class X implements A, B）</p>
        <p>└─ 接口 = 100% 抽象规范</p>
      </div>
      <div style="border-left:3px solid var(--danger);padding-left:0.75rem">
        <p style="font-weight:700;color:var(--danger);margin-bottom:0.25rem">OOP 三大特性</p>
        <p>├─ <span style="font-weight:600">封装</span>：private + getter/setter</p>
        <p>├─ <span style="font-weight:600">继承</span>：extends（单继承）/ interface（多实现）</p>
        <p>└─ <span style="font-weight:600">多态</span>：父类引用指向子类对象，调用重写方法</p>
      </div>
    </div>
  </div>`;
}

// ===== 代码模式库 =====
function renderCodePatterns() {
  const patterns = [
    {
      name: "🔧 工厂模式（Factory）",
      desc: "根据参数返回不同子类对象，题库第2题常考",
      code: `abstract class Product {
    abstract void show();
}
class Fan extends Product {
    void show() { System.out.println("风扇"); }
}
class Phone extends Product {
    void show() { System.out.println("手机"); }
}
class Factory {
    public static Product getProduct(String name) {
        if (name.equals("风扇")) return new Fan();
        else if (name.equals("手机")) return new Phone();
        return null;
    }
}
// 调用
Product p = Factory.getProduct("风扇");
p.show(); // 多态：调用 Fan 的 show`
    },
    {
      name: "🔌 适配器模式（Adapter）",
      desc: "把不兼容的接口转换成目标接口，题库第7题",
      code: `// 源类（英语单词）
class English {
    String[] list = {"dream","great","wonderful"};
    String getEnglishWord(int i) { return list[i]; }
}
// 目标接口
interface Chinese { String getChinese(); }
// 适配器
class PowerAdapter implements Chinese {
    English list; int index;
    PowerAdapter(English e, int i) { list=e; index=i; }
    String getChinese() {
        String w = list.getEnglishWord(index);
        if(w.equals("dream")) return "梦想";
        if(w.equals("great")) return "伟大";
        return null;
    }
}`
    },
    {
      name: "🔄 接口多态（Graph 模式）",
      desc: "接口定义→多类实现→统一调用，题库编写题3",
      code: `interface Graph { void drawing(); }
class Circle implements Graph {
    double r;
    Circle(double r) { this.r = r; }
    public void drawing() { System.out.println("圆,半径:"+r); }
}
class Rectangle implements Graph {
    double l, w;
    Rectangle(double l, double w) { this.l=l; this.w=w; }
    public void drawing() { System.out.println("矩形,"+l+"x"+w); }
}
// 多态调用
void myDraw(Graph g) { g.drawing(); }
myDraw(new Circle(5));
myDraw(new Rectangle(10,6));`
    },
    {
      name: "🏗️ 继承+接口综合（Person+ITask）",
      desc: "extends + implements 同时使用，编写题4",
      code: `class Person {
    String name;
    Person(String n) { name=n; }
    void saying(Person p, String m) {
        System.out.println(name+"对"+p.name+"说:"+m);
    }
}
interface ITask { void work(); void rest(); }
class Student extends Person implements ITask {
    Student(String n) { super(n); }
    public void work() { System.out.println(name+"学习"); }
    public void rest() { System.out.println(name+"休息"); }
}
// 多态使用
ITask t = new Student("悟空"); t.work();`
    }
  ];

  return `<div style="margin-bottom:1rem">
    <h3 style="font-weight:700;margin-bottom:0.75rem;font-size:1rem">💎 代码模式库（考题高频模板）</h3>
    <div style="display:flex;flex-direction:column;gap:0.5rem">
      ${patterns.map((p,i) => `
        <div class="code-pattern-card" onclick="this.classList.toggle('expanded')">
          <div class="kc-header">
            <span style="font-weight:700;font-size:0.9375rem">${p.name}</span>
            <span style="margin-left:auto;font-size:0.75rem;color:var(--text-muted)">▼</span>
          </div>
          <p style="color:var(--text-secondary);font-size:0.8125rem;margin-bottom:0">${p.desc}</p>
          <div class="kc-body">
            <pre style="background:#1e293b;color:#e2e8f0;padding:0.75rem;border-radius:6px;font-size:0.75rem;line-height:1.6;overflow-x:auto;white-space:pre-wrap">${esc(p.code)}</pre>
          </div>
        </div>
      `).join('')}
    </div>
  </div>`;
}

// ===== 读代码输出练习 =====
function renderCodeReading() {
  const exercises = [
    { code: "System.out.println(5&6);", output: "4", hint: "5=101, 6=110, 位与=100=4" },
    { code: "System.out.println(2<<3);", output: "16", hint: "2×2³=16" },
    { code: "System.out.println(5%2+2);", output: "3", hint: "5%2=1, 1+2=3" },
    { code: "System.out.println(37/10f);", output: "3.7", hint: "10f是float，结果为float" },
    { code: "System.out.println('1'+'2'+\"\"+3+4);", output: "9934", hint: "'1'=49,'2'=50,49+50=99,然后字符串拼接" },
    { code: "int[] a={1,2,3,4,5,6,7,8,9,10};\nSystem.out.println(a[9]);", output: "10", hint: "下标从0开始，a[9]是第10个元素" },
    { code: "int[][] arr={ {3,4,5},{7,8,2},{1},{6,2,8} };\nint temp=0;\nfor(int[] list:arr)\n  for(int x:list)\n    if(x>3) temp+=list.length;\nSystem.out.println(temp);", output: "18", hint: "统计每行大于3的元素个数×该行长度" },
    { code: "int a[]={1,3,5,7,9,11,13};\nint b[]=new int[10];\nint sum=0;\nSystem.arraycopy(a,2,b,3,3);\nfor(int x:b) sum=sum+x;\nSystem.out.println(sum);", output: "21", hint: "从a[2]=5开始复制3个元素{5,7,9}到b[3]位置" }
  ];

  return `<div style="margin-bottom:1rem">
    <h3 style="font-weight:700;margin-bottom:0.75rem;font-size:1rem">👁 读代码，测输出</h3>
    <p style="color:var(--text-secondary);font-size:0.8125rem;margin-bottom:0.75rem">上述代码的输出是什么？点击展开查看答案</p>
    ${exercises.map((ex,i) => `
      <div class="code-pattern-card" style="margin-bottom:0.5rem" onclick="this.classList.toggle('expanded')">
        <div class="kc-header">
          <span style="font-size:0.8125rem;font-weight:600">题${i+1}</span>
          <span style="margin-left:auto;font-size:0.75rem;color:var(--text-muted)">▼</span>
        </div>
        <pre style="background:#1e293b;color:#e2e8f0;padding:0.5rem;border-radius:4px;font-size:0.75rem;line-height:1.5;overflow-x:auto;white-space:pre-wrap;margin:0.5rem 0">${esc(ex.code)}</pre>
        <div class="kc-body">
          <p style="font-weight:700;color:var(--success);margin-bottom:0.25rem">✅ 输出: ${esc(ex.output)}</p>
          <p style="color:var(--text-secondary);font-size:0.75rem">${ex.hint}</p>
        </div>
      </div>
    `).join('')}
  </div>`;
}

// ===== 备考冲刺路线 =====
function renderSprintRoadmap() {
  const modules = [
    { name: "Java基础语法", icon: "📖", topics: "标识符、注释、数据类型、运算符、Scanner、Math", qCount: "~20题" },
    { name: "OOP核心（上）", icon: "🏗️", topics: "封装、构造方法、static、this、包", qCount: "~15题" },
    { name: "OOP核心（下）", icon: "🔗", topics: "继承、super、重写、final、多态", qCount: "~18题" },
    { name: "抽象类与接口", icon: "🔌", topics: "abstract、interface、implements、工厂模式", qCount: "~22题" },
    { name: "数组", icon: "📊", topics: "一维/二维数组、arraycopy、增强for、变长数组", qCount: "~15题" },
    { name: "综合编程", icon: "💻", topics: "程序编写题6道：Person/Animal/Graph/ITask/Student/密码验证", qCount: "6题" }
  ];

  return `<div style="margin-bottom:1rem">
    <h3 style="font-weight:700;margin-bottom:0.75rem;font-size:1rem">🗺️ 备考冲刺路线</h3>
    <p style="color:var(--text-secondary);font-size:0.8125rem;margin-bottom:0.75rem">按知识点分组，建议按照以下顺序逐个击破。每完成一个模块的习题，返回继续下一模块。</p>
    <div style="display:flex;flex-direction:column;gap:0.5rem">
      ${modules.map((m,i) => `
        <div class="app-card" style="padding:0.75rem;border-left:3px solid var(--primary)">
          <div style="display:flex;align-items:center;gap:0.5rem">
            <span style="font-size:1.25rem">${m.icon}</span>
            <span style="font-weight:700;font-size:0.9375rem">${i+1}. ${m.name}</span>
            <span style="margin-left:auto;font-size:0.75rem;color:var(--text-muted);white-space:nowrap">${m.qCount}</span>
          </div>
          <p style="color:var(--text-secondary);font-size:0.75rem;margin-top:0.25rem;padding-left:2rem">${m.topics}</p>
        </div>
      `).join('')}
    </div>
    <p style="text-align:center;color:var(--primary);font-size:0.8125rem;margin-top:0.75rem;font-weight:600">
      ⚡ 学习流程：刷题→错题库→再刷→直到全对
    </p>
  </div>`;
}

// ===== 主渲染 =====
export function renderJavaCrashPage() {
  const c = document.getElementById('java-crash-container');
  if (!c) return;
  c.innerHTML = `
    ${renderCPPComparison()}
    ${renderKnowledgeCards()}
    ${renderMindMap()}
    ${renderCodePatterns()}
    ${renderCodeReading()}
    ${renderSprintRoadmap()}
    <div style="text-align:center;margin:1rem 0">
      <button class="btn-primary" onclick="window.goToPage('java-mistakes')" style="width:100%;max-width:20rem;font-size:0.9375rem">
        📋 Java错题库 <span id="java-mistake-count-badge" style="font-size:0.75rem;opacity:0.8"></span>
      </button>
    </div>
    <p style="text-align:center;color:var(--text-muted);font-size:0.75rem;margin-top:0.5rem">
      💡 启用「记忆算法」刷 Java 题，答错自动录入错题库
    </p>`;

  document.getElementById('page-title').textContent = '☕ Java速成';

  // 显示错题数
  import('./java-mistakes.js').then(m => {
    const cnt = m.getJavaMistakeCount();
    const badge = document.getElementById('java-mistake-count-badge');
    if (badge && cnt > 0) badge.textContent = '(' + cnt + '题)';
  });
}
