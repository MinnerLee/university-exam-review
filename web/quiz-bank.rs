use std::{collections::HashSet, env, fs, io};

struct Bank {
    items: Vec<String>,
    prompts: HashSet<String>,
}

fn json(text: &str) -> String {
    format!(
        "\"{}\"",
        text.replace('\\', "\\\\")
            .replace('"', "\\\"")
            .replace('\n', "\\n")
    )
}

impl Bank {
    fn add(
        &mut self,
        topic: &str,
        title: &str,
        prompt: String,
        options: [String; 4],
        feedback: String,
    ) {
        assert!(self.prompts.insert(prompt.clone()), "重复题目 {prompt}");
        assert_eq!(
            options.iter().collect::<HashSet<_>>().len(),
            4,
            "重复选项 {prompt}"
        );
        let options = options
            .iter()
            .map(|value| json(value))
            .collect::<Vec<_>>()
            .join(",");
        self.items.push(format!(
            "{{\"id\":{},\"topic\":{},\"title\":{},\"prompt\":{},\"options\":[{}],\"answer\":0,\"feedback\":{}}}",
            json(&format!("{title}:{prompt}")), json(topic), json(title), json(&prompt),
            options, json(&feedback)
        ));
    }

    fn number(
        &mut self,
        topic: &str,
        title: &str,
        prompt: String,
        answer: i64,
        distractors: [i64; 3],
        feedback: String,
    ) {
        self.add(
            topic,
            title,
            prompt,
            [answer, distractors[0], distractors[1], distractors[2]].map(|n| n.to_string()),
            feedback,
        );
    }
}

fn main() -> io::Result<()> {
    let mut bank = Bank {
        items: Vec::new(),
        prompts: HashSet::new(),
    };
    for line in include_str!("quiz-concepts.tsv")
        .lines()
        .filter(|line| !line.trim().is_empty())
    {
        let fields: Vec<_> = line.split('\t').collect();
        let [
            topic,
            title,
            prompt,
            correct,
            wrong1,
            wrong2,
            wrong3,
            feedback,
        ] = fields.as_slice()
        else {
            panic!("题目应包含 8 列：{line}");
        };
        bank.add(
            topic,
            title,
            (*prompt).into(),
            [*correct, *wrong1, *wrong2, *wrong3].map(str::to_owned),
            (*feedback).into(),
        );
    }

    for a in 2_i64..=13 {
        let b = a + 1;
        bank.number(
            "basic-limits",
            "正弦等价替换",
            format!("x → 0 时，sin({a}x)/x 的极限是多少？"),
            a,
            [1, a * a, -a],
            format!("sin u ∼ u。把 u 看成 {a}x，约去 x 后剩下 {a}。"),
        );
        bank.number(
            "basic-limits",
            "余弦的二阶主项",
            format!("x → 0 时，(1−cos({a}x))/(x²/2) 的极限是多少？"),
            a * a,
            [a, -a * a, a * a + 1],
            format!("1−cos u ∼ u²/2。代入 u={a}x 后，系数要平方。"),
        );
        bank.number(
            "basic-limits",
            "对数的一阶主项",
            format!("x → 0 时，ln(1+{a}x)/x 的极限是多少？"),
            a,
            [0, a - 1, a + 1],
            format!("ln(1+u) ∼ u，所以分子的主项是 {a}x。"),
        );
        bank.number(
            "simplify-expand",
            "根式差有理化",
            format!("x → +∞ 时，√(x²+{})−x 的极限是多少？", 2 * a),
            0,
            [a, 2 * a, -a],
            format!(
                "乘以共轭后得到 {}/(√(x²+{})+x)。分子固定，分母趋向 +∞。",
                2 * a,
                2 * a
            ),
        );
        bank.number(
            "power-limits",
            "幂式极限先取对数",
            format!("令 y=(1+{a}x)^(1/x)。x → 0 时，ln y 的极限是多少？"),
            a,
            [0, -a, a * a],
            format!(
                "把指数拉下来，得到 ln(1+{a}x)/x，极限为 {a}。若问 y，再还原成 e 的 {a} 次方。"
            ),
        );
        bank.number(
            "estimates",
            "数列同除最高次幂",
            format!("n → ∞ 时，({a}n²+{b}n)/(n²+{a}) 的极限是多少？"),
            a,
            [b, a + b, 0],
            format!("上下同除以 n²。带 1/n 或 1/n² 的项都趋于 0，只剩 {a}。"),
        );
        bank.number(
            "estimates",
            "夹逼振荡项",
            format!("n → ∞ 时，{a}+({b}/n)·sin n 的极限是多少？"),
            a,
            [b, a + b, a - b],
            format!("振荡项的绝对值最多为 {b}/n，因此它趋于 0。"),
        );
        bank.number(
            "limit-constraints",
            "求水平渐近线",
            format!("y=({a}x+{b})/(x+1) 的水平渐近线 y 等于多少？"),
            a,
            [b, a + b, 0],
            format!("令 x → ±∞，上下同除以 x，极限是最高次项系数之比 {a}/1。"),
        );
        bank.number(
            "continuity",
            "补点使函数连续",
            format!("x≠0 时 f(x)=(e^({a}x)−1)/x。若要在 0 连续，应取 f(0) 等于多少？"),
            a,
            [0, 1, -a],
            format!("先求两侧共同的极限。e^u−1 ∼ u，所以极限是 {a}。"),
        );
        bank.number(
            "derivative-definition",
            "用差商读点导数",
            format!("已知 f(2+h)−f(2)={a}h+{b}h²，求 f′(2)。"),
            a,
            [b, a + b, 0],
            format!("两边除以 h，再令 h → 0。h² 项除完还剩一个 h，极限为 0。"),
        );
        bank.number(
            "differentiation",
            "复合求导的内层因子",
            format!("y=sin({a}x)，求 y′(0)。"),
            a,
            [1, -a, 0],
            format!("外层求导得 cos({a}x)，再乘内层导数 {a}。在 0 处 cos 0=1。"),
        );
        bank.number(
            "differentiation",
            "隐函数代点",
            format!("x²+y²={}，曲线经过 ({a},1)。求该点的 dy/dx。", a * a + 1),
            -a,
            [a, -2 * a, 0],
            format!("两边对 x 求导得到 2x+2yy′=0。代入 x={a}、y=1，得到 y′=−{a}。"),
        );
        bank.number(
            "inverse-functions",
            "反函数斜率取倒数",
            format!("若 f(1)={a}、f′(1)=1/{b}，且局部反函数存在，求 (f⁻¹)′({a})。"),
            b,
            [a, -b, 1],
            format!("反函数在 {a} 处对应原函数在 1 处的斜率。取 1/{b} 的倒数。"),
        );
        bank.number(
            "curves",
            "参数曲线的一阶导",
            format!("x=2t+1，y=t²，求 t={a} 处的 dy/dx。"),
            a,
            [a + 1, 2 * a, a * a + 2],
            format!("先算 dy/dt=2t 和 dx/dt=2。相除得 t，再代 t={a}。"),
        );
        bank.number(
            "curves",
            "参数曲线的二阶导",
            format!("x=2t+{a}，y={}t³，求 t=1 时的 d²y/dx²。", 2 * a),
            3 * a,
            [6 * a, a, 12 * a],
            format!(
                "一阶导是 {}t²。对 t 求导得到 {}t，再除以 dx/dt=2，最后代 t=1。",
                3 * a,
                6 * a
            ),
        );
        bank.number(
            "higher-derivatives",
            "从系数读出高阶导",
            format!("f(x)={a}x³+{b}x⁴，求 f 的三阶导数在 0 处的值。"),
            6 * a,
            [a, 6 * b, 3 * a],
            format!("三阶导数等于 x³ 的系数乘 3!，也就是 {a}×6。"),
        );
        bank.number(
            "differentials",
            "定点微分读系数",
            format!("y={a}x²+{b}，在 x=1 处 dy=K dx。求 K。"),
            2 * a,
            [a, b, 2 * a + 1],
            format!("K 就是 y′(1)。先求 y′={}x，再代 x=1。", 2 * a),
        );
        bank.number(
            "related-rates",
            "面积和半径的变化率",
            format!(
                "圆的半径此时为 {a} cm，半径增长速率为 1 cm/s。此时面积增长速率等于多少 π cm²/s？"
            ),
            2 * a,
            [a, a * a + 2, 1],
            format!("A=πr²，对时间求导得 A′=2πrr′。代 r={a}、r′=1。"),
        );
        bank.number(
            "rolle-basics",
            "罗尔定理定位中值点",
            format!("f(x)=(x−{a})(x−{}) 在两零点之间的哪一点导数为 0？", a + 2),
            b,
            [a, a + 2, a + 3],
            format!(
                "两端函数值都为 0，可以用罗尔定理。展开求导得 2x−{}，令它等于 0。",
                2 * b
            ),
        );
        bank.number(
            "proof-techniques",
            "拉格朗日中值点",
            format!("f(x)=x² 在 [0,{}] 上的拉格朗日中值点 ξ 是多少？", 2 * a),
            a,
            [2 * a, a + 1, 0],
            format!(
                "平均斜率是 {}，所以 2ξ={}。求出的 ξ 在开区间内。",
                2 * a,
                2 * a
            ),
        );
        bank.number(
            "taylor-methods",
            "指数的二阶系数",
            format!("e^({a}x) 在 0 展开时，x²/2 这一项的系数是多少？"),
            a * a,
            [a, a * a + 1, -a * a],
            format!("e^u 的二阶项是 u²/2。代入 u={a}x，剩下的系数是 {a}²。"),
        );
        bank.number(
            "function-behavior",
            "用导数找极小值点",
            format!("f(x)=x²−{}x+1 在哪个 x 处取得极小值？", 2 * a),
            a,
            [a - 1, a + 1, 2 * a],
            format!(
                "f′(x)=2x−{}。它在 x={a} 左边为负、右边为正，所以这里取得极小值。",
                2 * a
            ),
        );
        bank.number(
            "optimization",
            "固定周长的最大面积",
            format!("周长为 {} 的矩形，最大面积是多少？", 4 * a),
            a * a,
            [a * a - 1, a * a + 1, 2 * a * a],
            format!(
                "两条邻边之和是 {}。面积 x({}−x) 在 x={a} 时最大。",
                2 * a,
                2 * a
            ),
        );
        bank.number(
            "concavity",
            "二阶导变号找拐点",
            format!("曲线 y=(x−{a})³+{b} 的拐点横坐标是多少？"),
            a,
            [b, -a, 0],
            format!("y″=6(x−{a})，过 x={a} 时从负变正，所以凹凸性改变。"),
        );
        bank.number(
            "curvature",
            "水平切线处的曲率",
            format!("曲线 y={a}x² 在 x=0 的曲率是多少？"),
            2 * a,
            [a, -2 * a, 0],
            format!("此处 y′(0)=0，曲率公式的分母为 1，只剩 |y″(0)|={}。", 2 * a),
        );
    }

    let output = env::args()
        .nth(1)
        .unwrap_or_else(|| "dist/quiz-bank.js".into());
    let count = bank.items.len();
    fs::write(
        output,
        format!(
            "// Generated by quiz-bank.rs.\nglobalThis.reviewQuestionBank = [\n{}\n];\n",
            bank.items.join(",\n")
        ),
    )?;
    println!("Generated {count} quiz questions.");
    Ok(())
}
