import { MathEngine } from './engine.js';

document.addEventListener('DOMContentLoaded', () => {
  const engine = new MathEngine();

  // State
  let currentExpression = '';
  let isScientific = false;
  let history = [];
  let isHistoryOpen = false;
  let lastOperation = null; // Store { operator, operand } for repeat '=' behavior
  let justEvaluated = false;

  // DOM Elements
  const expressionDisplay = document.getElementById('expression-display');
  const resultDisplay = document.getElementById('result-display');

  const modeIndicator = document.getElementById('mode-indicator');
  const angleIndicator = document.getElementById('angle-indicator');

  const btnAngle = document.getElementById('btn-angle');
  const btnMode = document.getElementById('btn-mode');
  const btnClearHistory = document.getElementById('btn-clear-history');

  const scientificKeypad = document.getElementById('scientific-keypad');
  const basicKeypad = document.getElementById('basic-keypad');

  const historyPanel = document.getElementById('history-panel');
  const historyList = document.getElementById('history-list');
  const historyToggleBtn = document.getElementById('history-toggle-btn');
  const closeHistoryBtn = document.getElementById('close-history-btn');

  // Update UI Displays
  function updateDisplay(evaluatedResult = null) {
    expressionDisplay.textContent = currentExpression;

    if (evaluatedResult !== null) {
      resultDisplay.textContent = evaluatedResult;
      adjustResultFontSize(evaluatedResult);
    } else if (currentExpression.trim() !== '') {
      // Live evaluation preview
      const evalRes = engine.evaluate(currentExpression);
      if (evalRes.status === 'success') {
        resultDisplay.textContent = evalRes.formatted;
        adjustResultFontSize(evalRes.formatted);
      } else {
        // Keep prior or empty result line
      }
    } else {
      resultDisplay.textContent = '0';
      adjustResultFontSize('0');
    }
  }

  function adjustResultFontSize(text) {
    const len = String(text).length;
    if (len > 16) {
      resultDisplay.style.fontSize = '22px';
    } else if (len > 12) {
      resultDisplay.style.fontSize = '28px';
    } else if (len > 8) {
      resultDisplay.style.fontSize = '32px';
    } else {
      resultDisplay.style.fontSize = '38px';
    }
  }

  function appendToken(token) {
    if (justEvaluated && /[0-9.]/.test(token)) {
      // If typing a new number after evaluation, start fresh
      currentExpression = '';
      lastOperation = null;
    }
    justEvaluated = false;
    currentExpression += token;
    updateDisplay();
  }

  function handleAC() {
    currentExpression = '';
    lastOperation = null;
    justEvaluated = false;
    updateDisplay('0');
  }

  function handleDel() {
    justEvaluated = false;
    if (currentExpression.length > 0) {
      // Remove trailing word if it's a function like 'sin(' or 'sqrt('
      const funcMatch = currentExpression.match(/(sin|cos|tan|log|ln|sqrt|sqr|recip|fact)\($/);
      if (funcMatch) {
        currentExpression = currentExpression.slice(0, -funcMatch[0].length);
      } else {
        currentExpression = currentExpression.slice(0, -1);
      }
    }
    updateDisplay();
  }

  function parseLastOperation(expr) {
    // Match trailing binary operator and operand, e.g. "5 + 3" => op: '+', operand: '3'
    const match = expr.trim().match(/([\+\-\*\/])\s*([0-9.]+(?:\.[0-9]+)?)$/);
    if (match) {
      return { operator: match[1], operand: match[2] };
    }
    return null;
  }

  function handleEvaluate() {
    let exprToEval = currentExpression;

    // Repeat '=' behavior
    if (justEvaluated && lastOperation && currentExpression.trim() !== '') {
      exprToEval = `${currentExpression} ${lastOperation.operator} ${lastOperation.operand}`;
    }

    if (!exprToEval.trim()) return;

    const opInfo = parseLastOperation(exprToEval);

    const res = engine.evaluate(exprToEval);

    if (res.status === 'success') {
      const entry = {
        expression: exprToEval,
        result: res.formatted,
      };

      history.unshift(entry);
      renderHistory();

      if (opInfo) {
        lastOperation = opInfo;
      }

      currentExpression = res.formatted;
      justEvaluated = true;
      updateDisplay(res.formatted);
    } else {
      resultDisplay.textContent = res.message;
      adjustResultFontSize(res.message);
      justEvaluated = false;
    }
  }

  function handleOperator(op) {
    justEvaluated = false;
    const trimmed = currentExpression.trim();
    const lastChar = trimmed.slice(-1);

    // Operator replacement rule: 5 + * -> 5 * (allow unary minus like 5 * -)
    if (['+', '*', '/'].includes(lastChar) && ['+', '*', '/'].includes(op)) {
      currentExpression = trimmed.slice(0, -1) + op;
      updateDisplay();
      return;
    }

    if (lastChar === '-' && ['+', '-', '*', '/'].includes(op)) {
      currentExpression = trimmed.slice(0, -1) + op;
      updateDisplay();
      return;
    }

    appendToken(op);
  }

  // Keypad click handlers
  basicKeypad.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    triggerVisualFeedback(btn);

    if (btn.dataset.num !== undefined) {
      appendToken(btn.dataset.num);
    } else if (btn.dataset.op !== undefined) {
      handleOperator(btn.dataset.op);
    } else if (btn.dataset.action === 'ac') {
      handleAC();
    } else if (btn.dataset.action === 'del') {
      handleDel();
    } else if (btn.dataset.action === 'equals') {
      handleEvaluate();
    }
  });

  scientificKeypad.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    triggerVisualFeedback(btn);

    const action = btn.dataset.action;
    switch (action) {
      case 'sin':
      case 'cos':
      case 'tan':
      case 'log':
      case 'ln':
      case 'sqrt':
        appendToken(`${action}(`);
        break;
      case 'sqr':
        appendToken('^2');
        break;
      case 'pow':
        appendToken('^');
        break;
      case 'recip':
        appendToken('recip(');
        break;
      case 'fact':
        appendToken('!');
        break;
      case 'pi':
        appendToken('π');
        break;
      case 'paren-open':
        appendToken('(');
        break;
      case 'paren-close':
        appendToken(')');
        break;
      case 'percent':
        appendToken('%');
        break;
      case 'negate':
        justEvaluated = false;
        if (currentExpression.startsWith('-(') && currentExpression.endsWith(')')) {
          currentExpression = currentExpression.slice(2, -1);
        } else {
          currentExpression = `-(${currentExpression})`;
        }
        updateDisplay();
        break;
    }
  });

  // Toolbar toggles
  btnAngle.addEventListener('click', () => {
    triggerVisualFeedback(btnAngle);
    const nextMode = engine.getAngleMode() === 'DEG' ? 'RAD' : 'DEG';
    engine.setAngleMode(nextMode);
    angleIndicator.textContent = nextMode;
    btnAngle.textContent = nextMode;
    updateDisplay();
  });

  btnMode.addEventListener('click', () => {
    triggerVisualFeedback(btnMode);
    isScientific = !isScientific;
    scientificKeypad.classList.toggle('hidden', !isScientific);
    modeIndicator.textContent = isScientific ? 'SCI' : 'BASIC';
    btnMode.textContent = isScientific ? 'Basic' : 'Sci';
  });

  // History panel
  function renderHistory() {
    if (history.length === 0) {
      historyList.innerHTML = '<div class="history-empty">No history yet</div>';
      return;
    }

    historyList.innerHTML = history
      .map(
        (item) => `
        <div class="history-item" data-result="${item.result}" role="button" tabindex="0" aria-label="Recall result ${item.result} from calculation ${item.expression}">
          <div class="history-item-expr">${item.expression} =</div>
          <div class="history-item-res">${item.result}</div>
        </div>
      `
      )
      .join('');
  }

  historyList.addEventListener('click', (e) => {
    const item = e.target.closest('.history-item');
    if (item && item.dataset.result) {
      currentExpression = item.dataset.result;
      justEvaluated = true;
      updateDisplay(item.dataset.result);
    }
  });

  historyList.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      const item = e.target.closest('.history-item');
      if (item && item.dataset.result) {
        currentExpression = item.dataset.result;
        justEvaluated = true;
        updateDisplay(item.dataset.result);
      }
    }
  });

  btnClearHistory.addEventListener('click', () => {
    triggerVisualFeedback(btnClearHistory);
    history = [];
    renderHistory();
  });

  function toggleHistory() {
    isHistoryOpen = !isHistoryOpen;
    historyPanel.classList.toggle('closed', !isHistoryOpen);
  }

  historyToggleBtn.addEventListener('click', toggleHistory);
  closeHistoryBtn.addEventListener('click', toggleHistory);

  // Visual feedback helper
  function triggerVisualFeedback(element) {
    if (!element) return;
    element.classList.add('btn-active');
    setTimeout(() => {
      element.classList.remove('btn-active');
    }, 120);
  }

  function findButtonForKey(key) {
    if (key >= '0' && key <= '9') {
      return document.querySelector(`button[data-num="${key}"]`);
    }
    if (key === '.') return document.querySelector(`button[data-num="."]`);
    if (key === '+') return document.querySelector(`button[data-op="+"]`);
    if (key === '-') return document.querySelector(`button[data-op="-"]`);
    if (key === '*') return document.querySelector(`button[data-op="*"]`);
    if (key === '/') return document.querySelector(`button[data-op="/"]`);
    if (key === 'Enter' || key === '=') return document.getElementById('btn-equals');
    if (key === 'Backspace') return document.getElementById('btn-del');
    if (key === 'Escape') return document.getElementById('btn-ac');
    if (key === '%') return document.querySelector(`button[data-action="percent"]`);
    if (key === '(') return document.querySelector(`button[data-action="paren-open"]`);
    if (key === ')') return document.querySelector(`button[data-action="paren-close"]`);
    return null;
  }

  // Keyboard support
  document.addEventListener('keydown', (e) => {
    // Avoid capturing if focused on input/textarea
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

    const matchedBtn = findButtonForKey(e.key);
    if (matchedBtn) {
      triggerVisualFeedback(matchedBtn);
    }

    if (e.key >= '0' && e.key <= '9') {
      appendToken(e.key);
    } else if (e.key === '.') {
      appendToken('.');
    } else if (e.key === '+') {
      handleOperator('+');
    } else if (e.key === '-') {
      handleOperator('-');
    } else if (e.key === '*') {
      handleOperator('*');
    } else if (e.key === '/') {
      e.preventDefault();
      handleOperator('/');
    } else if (e.key === '(' || e.key === ')') {
      appendToken(e.key);
    } else if (e.key === '%') {
      appendToken('%');
    } else if (e.key === 'Enter' || e.key === '=') {
      e.preventDefault();
      handleEvaluate();
    } else if (e.key === 'Backspace') {
      handleDel();
    } else if (e.key === 'Escape') {
      handleAC();
    }
  });

  // Initial setup
  historyPanel.classList.add('closed');
  updateDisplay();
});
