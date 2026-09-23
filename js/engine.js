/**
 * Core Mathematical Engine for Modern Calculator
 * Supports tokenization, precedence evaluation, scientific operations, percentages, and domain error handling.
 */

export class MathEngine {
  constructor() {
    this.angleMode = 'DEG'; // 'DEG' or 'RAD'
  }

  setAngleMode(mode) {
    if (mode === 'DEG' || mode === 'RAD') {
      this.angleMode = mode;
    }
  }

  getAngleMode() {
    return this.angleMode;
  }

  /**
   * Main evaluation entry point
   * @param {string} expression - The mathematical expression string
   * @param {object} options - Options such as angleMode
   * @returns {{ status: 'success', value: number, formatted: string } | { status: 'error', message: string }}
   */
  evaluate(expression, options = {}) {
    const angleMode = options.angleMode || this.angleMode;

    if (!expression || typeof expression !== 'string' || expression.trim() === '') {
      return { status: 'success', value: 0, formatted: '0' };
    }

    try {
      // Clean up string symbols
      let sanitized = this.normalizeExpression(expression);

      // Pre-process percentages
      sanitized = this.processPercentages(sanitized);

      // Tokenize
      const tokens = this.tokenize(sanitized);
      if (tokens.length === 0) {
        return { status: 'success', value: 0, formatted: '0' };
      }

      // Auto-close open parentheses
      const balancedTokens = this.balanceParentheses(tokens);

      // Convert to Reverse Polish Notation (Shunting-Yard)
      const rpn = this.shuntingYard(balancedTokens);

      // Evaluate RPN stack
      const result = this.evaluateRPN(rpn, angleMode);

      if (typeof result === 'string') {
        return { status: 'error', message: result };
      }

      if (typeof result !== 'number' || isNaN(result)) {
        return { status: 'error', message: 'Invalid expression' };
      }

      if (!isFinite(result)) {
        return { status: 'error', message: 'Result too large' };
      }

      const formatted = this.formatResult(result);
      return { status: 'success', value: result, formatted };
    } catch (err) {
      if (typeof err === 'string') {
        return { status: 'error', message: err };
      }
      return { status: 'error', message: 'Invalid expression' };
    }
  }

  normalizeExpression(expr) {
    return expr
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/−/g, '-')
      .replace(/π/g, 'PI')
      .replace(/√\(/g, 'sqrt(')
      .replace(/√([0-9.a-zA-Z]+)/g, 'sqrt($1)');
  }

  /**
   * Convert percentages in expression to their numerical equivalent
   * Standalone 50% -> (50/100)
   * Contextual 200 + 10% -> 200 + (200 * 10 / 100)
   * Contextual 200 - 10% -> 200 - (200 * 10 / 100)
   * Contextual 200 * 10% -> 200 * (10 / 100)
   * Contextual 200 / 10% -> 200 / (10 / 100)
   */
  processPercentages(expr) {
    // Contextual addition/subtraction: A + B% -> A + (A * B / 100)
    const addSubRegex = /([0-9.]+(?:\.[0-9]+)?)\s*([\+\-])\s*([0-9.]+(?:\.[0-9]+)?)\s*%/g;
    expr = expr.replace(addSubRegex, (match, a, op, b) => {
      return `${a} ${op} (${a} * ${b} / 100)`;
    });

    // Standalone or mult/div percentage: B% -> (B / 100)
    const percentRegex = /([0-9.]+(?:\.[0-9]+)?)\s*%/g;
    expr = expr.replace(percentRegex, '($1 / 100)');

    return expr;
  }

  tokenize(expr) {
    const tokens = [];
    let i = 0;

    while (i < expr.length) {
      const char = expr[i];

      // Skip whitespace
      if (/\s/.test(char)) {
        i++;
        continue;
      }

      // Numbers and decimals
      if (/[0-9.]/.test(char)) {
        let numStr = '';
        let decimalCount = 0;

        while (i < expr.length && /[0-9.]/.test(expr[i])) {
          if (expr[i] === '.') {
            decimalCount++;
            if (decimalCount > 1) {
              // Ignore extra decimal point or throw
              i++;
              continue;
            }
          }
          numStr += expr[i];
          i++;
        }

        tokens.push({ type: 'NUMBER', value: parseFloat(numStr) });
        continue;
      }

      // Constants
      if (expr.substr(i, 2) === 'PI') {
        tokens.push({ type: 'NUMBER', value: Math.PI });
        i += 2;
        continue;
      }

      // Functions
      const funcs = ['sin', 'cos', 'tan', 'log', 'ln', 'sqrt', 'sqr', 'recip', 'fact'];
      let matchedFunc = null;

      for (const fn of funcs) {
        if (expr.substr(i, fn.length) === fn) {
          matchedFunc = fn;
          break;
        }
      }

      if (matchedFunc) {
        tokens.push({ type: 'FUNCTION', value: matchedFunc });
        i += matchedFunc.length;
        continue;
      }

      // Operators & Unary Minus
      if (['+', '-', '*', '/', '^', '!'].includes(char)) {
        const prevToken = tokens[tokens.length - 1];
        const isUnary = char === '-' && (!prevToken || prevToken.type === 'OPERATOR' || (prevToken.type === 'PAREN' && prevToken.value === '('));

        if (isUnary && i + 1 < expr.length && /[0-9.]/.test(expr[i + 1])) {
          // Parse as negative number directly
          i++; // Skip '-'
          let numStr = '-';
          let decimalCount = 0;

          while (i < expr.length && /[0-9.]/.test(expr[i])) {
            if (expr[i] === '.') {
              decimalCount++;
              if (decimalCount > 1) {
                i++;
                continue;
              }
            }
            numStr += expr[i];
            i++;
          }

          tokens.push({ type: 'NUMBER', value: parseFloat(numStr) });
          continue;
        }

        if (isUnary) {
          tokens.push({ type: 'NUMBER', value: 0 }); // Turn -func into 0 - func
        }

        tokens.push({ type: 'OPERATOR', value: char });
        i++;
        continue;
      }

      // Parentheses
      if (char === '(' || char === ')') {
        tokens.push({ type: 'PAREN', value: char });
        i++;
        continue;
      }

      // Unknown character -> invalid
      throw 'Invalid expression';
    }

    return tokens;
  }

  balanceParentheses(tokens) {
    let openCount = 0;
    let closeCount = 0;

    for (const token of tokens) {
      if (token.type === 'PAREN') {
        if (token.value === '(') openCount++;
        if (token.value === ')') closeCount++;
      }
    }

    const balanced = [...tokens];
    while (openCount > closeCount) {
      balanced.push({ type: 'PAREN', value: ')' });
      closeCount++;
    }

    return balanced;
  }

  shuntingYard(tokens) {
    const outputQueue = [];
    const operatorStack = [];

    const precedence = {
      '+': 1,
      '-': 1,
      '*': 2,
      '/': 2,
      '^': 3,
      '!': 4,
    };

    const associativity = {
      '+': 'Left',
      '-': 'Left',
      '*': 'Left',
      '/': 'Left',
      '^': 'Right',
      '!': 'Left',
    };

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      if (token.type === 'NUMBER') {
        outputQueue.push(token);
      } else if (token.type === 'FUNCTION') {
        operatorStack.push(token);
      } else if (token.type === 'OPERATOR') {
        const o1 = token.value;
        let topStack = operatorStack[operatorStack.length - 1];

        while (
          topStack &&
          (topStack.type === 'FUNCTION' ||
            (topStack.type === 'OPERATOR' &&
              ((associativity[o1] === 'Left' && precedence[o1] <= precedence[topStack.value]) ||
                (associativity[o1] === 'Right' && precedence[o1] < precedence[topStack.value]))))
        ) {
          outputQueue.push(operatorStack.pop());
          topStack = operatorStack[operatorStack.length - 1];
        }

        operatorStack.push(token);
      } else if (token.type === 'PAREN' && token.value === '(') {
        operatorStack.push(token);
      } else if (token.type === 'PAREN' && token.value === ')') {
        while (
          operatorStack.length > 0 &&
          !(operatorStack[operatorStack.length - 1].type === 'PAREN' && operatorStack[operatorStack.length - 1].value === '(')
        ) {
          outputQueue.push(operatorStack.pop());
        }

        if (operatorStack.length === 0) {
          throw 'Invalid expression'; // Mismatched parentheses
        }

        operatorStack.pop(); // Pop '('

        if (operatorStack.length > 0 && operatorStack[operatorStack.length - 1].type === 'FUNCTION') {
          outputQueue.push(operatorStack.pop());
        }
      }
    }

    while (operatorStack.length > 0) {
      const top = operatorStack.pop();
      if (top.type === 'PAREN') {
        throw 'Invalid expression';
      }
      outputQueue.push(top);
    }

    return outputQueue;
  }

  evaluateRPN(rpn, angleMode) {
    const stack = [];

    for (const token of rpn) {
      if (token.type === 'NUMBER') {
        stack.push(token.value);
      } else if (token.type === 'OPERATOR') {
        if (token.value === '!') {
          if (stack.length < 1) throw 'Invalid expression';
          const a = stack.pop();
          const factRes = this.factorial(a);
          if (typeof factRes === 'string') return factRes;
          stack.push(factRes);
          continue;
        }

        if (stack.length < 2) throw 'Invalid expression';
        const b = stack.pop();
        const a = stack.pop();

        switch (token.value) {
          case '+':
            stack.push(a + b);
            break;
          case '-':
            stack.push(a - b);
            break;
          case '*':
            stack.push(a * b);
            break;
          case '/':
            if (b === 0) return 'Cannot divide by zero';
            stack.push(a / b);
            break;
          case '^':
            stack.push(Math.pow(a, b));
            break;
          default:
            throw 'Invalid expression';
        }
      } else if (token.type === 'FUNCTION') {
        if (stack.length < 1) throw 'Invalid expression';
        const arg = stack.pop();
        const fnRes = this.evaluateFunction(token.value, arg, angleMode);
        if (typeof fnRes === 'string') return fnRes;
        stack.push(fnRes);
      }
    }

    if (stack.length !== 1) {
      throw 'Invalid expression';
    }

    return stack[0];
  }

  evaluateFunction(fn, arg, angleMode) {
    let rad = arg;
    if (angleMode === 'DEG' && ['sin', 'cos', 'tan'].includes(fn)) {
      rad = (arg * Math.PI) / 180;
    }

    switch (fn) {
      case 'sin':
        // Fix precision for sin(180) = 0
        const sinVal = Math.sin(rad);
        return Math.abs(sinVal) < 1e-15 ? 0 : sinVal;

      case 'cos':
        // Fix precision for cos(90) = 0
        const cosVal = Math.cos(rad);
        return Math.abs(cosVal) < 1e-15 ? 0 : cosVal;

      case 'tan':
        if (angleMode === 'DEG') {
          const mod = Math.abs(arg) % 180;
          if (Math.abs(mod - 90) < 1e-10) {
            return 'Undefined';
          }
        } else {
          const mod = Math.abs(arg) % Math.PI;
          if (Math.abs(mod - Math.PI / 2) < 1e-10) {
            return 'Undefined';
          }
        }
        const tanVal = Math.tan(rad);
        return Math.abs(tanVal) < 1e-15 ? 0 : tanVal;

      case 'sqrt':
        if (arg < 0) return 'Invalid input for √';
        return Math.sqrt(arg);

      case 'sqr':
        return arg * arg;

      case 'recip':
        if (arg === 0) return 'Cannot divide by zero';
        return 1 / arg;

      case 'log':
        if (arg <= 0) return 'Invalid input for log';
        return Math.log10(arg);

      case 'ln':
        if (arg <= 0) return 'Invalid input for log';
        return Math.log(arg);

      case 'fact':
        return this.factorial(arg);

      default:
        throw 'Invalid expression';
    }
  }

  factorial(n) {
    if (n < 0 || !Number.isInteger(n)) {
      return 'Invalid input for factorial';
    }
    if (n > 170) {
      return 'Result too large';
    }
    let res = 1;
    for (let i = 2; i <= n; i++) {
      res *= i;
    }
    return res;
  }

  formatResult(val) {
    if (typeof val !== 'number') return String(val);

    // Check if result is integer
    if (Number.isInteger(val) && Math.abs(val) < 1e15) {
      return String(val);
    }

    // Large or small numbers scientific notation
    if (Math.abs(val) >= 1e12 || (Math.abs(val) < 1e-6 && val !== 0)) {
      return val.toExponential(8).replace(/\.?0+e/, 'e');
    }

    // Standard floating point rounding to avoid precision issues like 0.1 + 0.2 = 0.30000000000000004
    const rounded = parseFloat(val.toFixed(10));
    return String(rounded);
  }
}
