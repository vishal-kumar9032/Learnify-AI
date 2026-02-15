import { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Play, RotateCcw, Terminal, Loader2, ChevronDown, Copy, Check, Maximize2, Minimize2, X, Trash2, Zap } from 'lucide-react';
import { executeJavaScript, executePython, executeTypeScript } from '../../services/clientExecutor';
import { executeCode, LANGUAGE_CONFIG } from '../../services/piston';

const LANGUAGES = [
    { id: 'javascript', name: 'JavaScript', icon: '⚡', version: 'ES2021 (Local)', mode: 'client', editorLang: 'javascript', boilerplate: `// JavaScript — runs instantly in your browser

function fibonacci(n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log("Fibonacci sequence:");
for (let i = 0; i < 10; i++) {
    console.log(\`  fib(\${i}) = \${fibonacci(i)}\`);
}` },
    { id: 'python', name: 'Python', icon: '🐍', version: '3.10 (Local)', mode: 'client', editorLang: 'python', boilerplate: `# Python — runs via WebAssembly

def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

print("Fibonacci sequence:")
for i in range(10):
    print(f"  fib({i}) = {fibonacci(i)}")` },
    { id: 'typescript', name: 'TypeScript', icon: '📘', version: '5.0 (Local)', mode: 'client', editorLang: 'typescript', boilerplate: `// TypeScript — transpiled locally

function greet(name: string): string {
    return \`Hello, \${name}!\`;
}

const numbers: number[] = [1, 2, 3, 4, 5];
const doubled: number[] = numbers.map((n: number) => n * 2);

console.log(greet("World"));
console.log("Doubled:", doubled);` },
    { id: 'java', name: 'Java', icon: '☕', version: '15 (Piston)', mode: 'server', editorLang: 'java', boilerplate: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello from Java!");

        int[] nums = {1, 2, 3, 4, 5};
        int sum = 0;
        for (int n : nums) sum += n;
        System.out.println("Sum: " + sum);
    }
}` },
    { id: 'cpp', name: 'C++', icon: '⚙️', version: '17 (Piston)', mode: 'server', editorLang: 'cpp', boilerplate: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    cout << "Hello from C++!" << endl;

    vector<int> nums = {1, 2, 3, 4, 5};
    int sum = 0;
    for (int n : nums) sum += n;
    cout << "Sum: " << sum << endl;
    return 0;
}` },
    { id: 'c', name: 'C', icon: '🔧', version: '17 (Piston)', mode: 'server', editorLang: 'c', boilerplate: `#include <stdio.h>

int main() {
    printf("Hello from C!\\n");

    int nums[] = {1, 2, 3, 4, 5};
    int sum = 0;
    for (int i = 0; i < 5; i++) sum += nums[i];
    printf("Sum: %d\\n", sum);
    return 0;
}` },
    { id: 'go', name: 'Go', icon: '🐹', version: '1.16 (Piston)', mode: 'server', editorLang: 'go', boilerplate: `package main

import "fmt"

func main() {
    fmt.Println("Hello from Go!")

    nums := []int{1, 2, 3, 4, 5}
    sum := 0
    for _, n := range nums {
        sum += n
    }
    fmt.Println("Sum:", sum)
}` },
    { id: 'rust', name: 'Rust', icon: '🦀', version: '1.68 (Piston)', mode: 'server', editorLang: 'rust', boilerplate: `fn main() {
    println!("Hello from Rust!");

    let nums = vec![1, 2, 3, 4, 5];
    let sum: i32 = nums.iter().sum();
    println!("Sum: {}", sum);
}` },
    { id: 'csharp', name: 'C#', icon: '🎯', version: '6.12 (Piston)', mode: 'server', editorLang: 'csharp', boilerplate: `using System;

class Program {
    static void Main() {
        Console.WriteLine("Hello from C#!");

        int[] nums = {1, 2, 3, 4, 5};
        int sum = 0;
        foreach (int n in nums) sum += n;
        Console.WriteLine("Sum: " + sum);
    }
}` },
    { id: 'ruby', name: 'Ruby', icon: '💎', version: '3.0 (Piston)', mode: 'server', editorLang: 'ruby', boilerplate: `puts "Hello from Ruby!"

nums = [1, 2, 3, 4, 5]
sum = nums.sum
puts "Sum: #{sum}"` },
];

export default function CodePractice() {
    const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
    const [code, setCode] = useState(LANGUAGES[0].boilerplate);
    const [output, setOutput] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showLangMenu, setShowLangMenu] = useState(false);
    const [copied, setCopied] = useState(false);
    const [statusMsg, setStatusMsg] = useState('');
    const [executionTime, setExecutionTime] = useState(null);
    const editorRef = useRef(null);
    const [terminalHistory, setTerminalHistory] = useState([]);
    const [terminalInput, setTerminalInput] = useState('');
    const [cmdHistoryIndex, setCmdHistoryIndex] = useState(-1);
    const [cmdHistory, setCmdHistory] = useState([]);
    const terminalEndRef = useRef(null);
    const terminalInputRef = useRef(null);

    const handleLanguageChange = (lang) => {
        setSelectedLang(lang);
        setCode(lang.boilerplate);
        setOutput('');
        setShowLangMenu(false);
        setStatusMsg('');
        setTerminalHistory([]);
        setTerminalInput('');
        setCmdHistory([]);
        setCmdHistoryIndex(-1);
        setExecutionTime(null);
    };

    const handleRun = async () => {
        setIsRunning(true);
        setOutput('');
        setStatusMsg('Running...');
        setExecutionTime(null);

        const startTime = performance.now();

        try {
            if (selectedLang.mode === 'client') {
                let result;

                if (selectedLang.id === 'javascript') {
                    result = executeJavaScript(code);
                } else if (selectedLang.id === 'python') {
                    result = await executePython(code, (msg) => setStatusMsg(msg));
                } else if (selectedLang.id === 'typescript') {
                    result = executeTypeScript(code);
                }

                const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
                setExecutionTime(elapsed);

                if (result) {
                    const timeInfo = `\n\n───\n⏱ Executed in ${result.executionTime || elapsed + 's'}`;
                    if (result.success) {
                        setOutput(result.output + timeInfo);
                    } else {
                        setOutput(
                            (result.output ? result.output + '\n' : '') +
                            '❌ ' + result.error + timeInfo
                        );
                    }
                } else {
                    setOutput('❌ No result returned from executor.');
                }
            } else {
                setStatusMsg('Executing via Piston...');
                const result = await executeCode(selectedLang.id, code, 15000);
                
                const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
                setExecutionTime(elapsed);

                if (result.success) {
                    let out = '';
                    if (result.compileOutput) {
                        out += `━━━ Compilation ━━━\n${result.compileOutput}\n\n`;
                    }
                    out += `━━━ Output ━━━\n`;
                    if (result.stdout) out += result.stdout;
                    if (result.stderr) {
                        out += `\n━━━ Errors ━━━\n${result.stderr}`;
                    }
                    if (!result.stdout && !result.stderr) {
                        out += '(no output)';
                    }
                    out += `\n\n───\n⏱ Executed in ${elapsed}s`;
                    setOutput(out);
                } else {
                    setOutput(`❌ ${result.error}\n\nMake sure your code is valid ${selectedLang.name}.\n\n───\n⏱ ${elapsed}s`);
                }
            }
        } catch (err) {
            const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
            setExecutionTime(elapsed);
            setOutput(`❌ Error: ${err.message}\n\n───\n⏱ ${elapsed}s`);
        } finally {
            setIsRunning(false);
            setStatusMsg('');
        }
    };

    const handleReset = () => {
        setCode(selectedLang.boilerplate);
        setOutput('');
        setExecutionTime(null);
        setTerminalHistory([]);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleTerminalCommand = async (cmd) => {
        if (!cmd.trim()) return;

        setCmdHistory(prev => [...prev, cmd]);
        setCmdHistoryIndex(-1);

        const prompt = selectedLang.id === 'python' ? '>>>' : '>';
        setTerminalHistory(prev => [...prev, { type: 'input', text: `${prompt} ${cmd}` }]);

        try {
            let result;
            if (selectedLang.id === 'javascript' || selectedLang.id === 'typescript') {
                result = executeJavaScript(cmd);
            } else if (selectedLang.id === 'python') {
                result = await executePython(cmd, () => { });
            } else {
                setTerminalHistory(prev => [...prev, { type: 'error', text: '⚠ Interactive mode only available for JS, TS, and Python' }]);
                return;
            }

            if (result) {
                const outputText = result.success
                    ? (result.output || '(undefined)')
                    : `❌ ${result.error}`;
                setTerminalHistory(prev => [...prev, { type: result.success ? 'output' : 'error', text: outputText }]);
            }
        } catch (err) {
            setTerminalHistory(prev => [...prev, { type: 'error', text: `❌ ${err.message}` }]);
        }

        setTerminalInput('');
        setTimeout(() => terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    };

    const handleTerminalKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleTerminalCommand(terminalInput);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (cmdHistory.length > 0) {
                const newIndex = cmdHistoryIndex === -1 ? cmdHistory.length - 1 : Math.max(0, cmdHistoryIndex - 1);
                setCmdHistoryIndex(newIndex);
                setTerminalInput(cmdHistory[newIndex]);
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (cmdHistoryIndex >= 0) {
                const newIndex = cmdHistoryIndex + 1;
                if (newIndex >= cmdHistory.length) {
                    setCmdHistoryIndex(-1);
                    setTerminalInput('');
                } else {
                    setCmdHistoryIndex(newIndex);
                    setTerminalInput(cmdHistory[newIndex]);
                }
            }
        } else if (e.key === 'l' && e.ctrlKey) {
            e.preventDefault();
            setTerminalHistory([]);
        }
    };

    return (
        <div className={`h-full flex flex-col bg-[#1a1a2e] overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>

            <div className="h-11 border-b border-white/[0.06] bg-[#1e1e32] flex items-center justify-between px-3 shrink-0 gap-2">
                <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-orange-400" />
                    <span className="text-xs font-semibold text-gray-300 hidden sm:block">Code Practice</span>
                </div>

                <div className="relative">
                    <button
                        onClick={() => setShowLangMenu(!showLangMenu)}
                        className="flex items-center gap-2 px-2.5 py-1.5 bg-white/[0.05] hover:bg-white/[0.08] rounded-lg border border-white/[0.06] text-sm transition-colors"
                    >
                        <span className="text-base leading-none">{selectedLang.icon}</span>
                        <span className="text-gray-200 text-xs font-medium">{selectedLang.name}</span>
                        {selectedLang.mode === 'client' && (
                            <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-1 py-px rounded font-bold">LOCAL</span>
                        )}
                        <ChevronDown className="w-3 h-3 text-gray-500" />
                    </button>

                    {showLangMenu && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowLangMenu(false)} />
                            <div className="absolute top-full left-0 mt-1 w-56 bg-[#252542] border border-white/[0.08] rounded-xl shadow-2xl z-50 py-1 max-h-[70vh] overflow-y-auto">
                                <div className="px-3 py-1.5 text-[9px] font-bold text-gray-500 uppercase tracking-widest">⚡ Instant (Local)</div>
                                {LANGUAGES.filter(l => l.mode === 'client').map(lang => (
                                    <LangOption key={lang.id} lang={lang} selected={selectedLang.id === lang.id} onClick={() => handleLanguageChange(lang)} />
                                ))}
                                <div className="my-1 border-t border-white/[0.06]" />
                                <div className="px-3 py-1.5 text-[9px] font-bold text-gray-500 uppercase tracking-widest">🌐 Piston API</div>
                                {LANGUAGES.filter(l => l.mode === 'server').map(lang => (
                                    <LangOption key={lang.id} lang={lang} selected={selectedLang.id === lang.id} onClick={() => handleLanguageChange(lang)} />
                                ))}
                            </div>
                        </>
                    )}
                </div>

                <div className="flex items-center gap-1.5">
                    {executionTime && (
                        <span className="text-[10px] text-gray-500 flex items-center gap-1 px-2">
                            <Zap className="w-3 h-3" />
                            {executionTime}s
                        </span>
                    )}
                    <button onClick={handleCopy} className="p-1.5 text-gray-500 hover:text-white hover:bg-white/[0.06] rounded-md transition-colors" title="Copy code">
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={handleReset} className="p-1.5 text-gray-500 hover:text-white hover:bg-white/[0.06] rounded-md transition-colors" title="Reset">
                        <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-1.5 text-gray-500 hover:text-white hover:bg-white/[0.06] rounded-md transition-colors hidden md:flex" title="Fullscreen">
                        {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                    </button>
                    <div className="w-px h-5 bg-white/[0.06] mx-0.5" />
                    <button
                        onClick={handleRun}
                        disabled={isRunning}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-900/20"
                    >
                        {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                        <span>{isRunning ? 'Running…' : 'Run'}</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 min-h-0 hidden md:flex flex-row overflow-hidden">
                <div className="flex-1 min-w-0 min-h-0 relative">
                    <Editor
                        height="100%"
                        language={selectedLang.editorLang}
                        value={code}
                        theme="vs-dark"
                        onChange={(val) => setCode(val || '')}
                        onMount={(editor) => { editorRef.current = editor; }}
                        options={{
                            minimap: { enabled: false },
                            fontSize: 14,
                            scrollBeyondLastLine: false,
                            padding: { top: 16, bottom: 16 },
                            fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', Consolas, monospace",
                            fontLigatures: true,
                            lineNumbers: 'on',
                            renderLineHighlight: 'all',
                            cursorBlinking: 'smooth',
                            smoothScrolling: true,
                            wordWrap: 'on',
                            automaticLayout: true,
                            tabSize: 4,
                        }}
                    />
                </div>

                <div className="w-[420px] flex-shrink-0 border-l border-white/[0.06] bg-[#0d0d1a] flex flex-col">
                    <div className="h-9 flex items-center justify-between px-3 border-b border-white/[0.06] shrink-0">
                        <div className="flex items-center gap-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                            <Terminal className="w-3.5 h-3.5" />
                            Terminal
                        </div>
                        <button
                            onClick={() => { setOutput(''); setTerminalHistory([]); }}
                            className="text-[10px] text-gray-500 hover:text-white px-1.5 py-0.5 rounded hover:bg-white/[0.06] transition-colors"
                        >
                            Clear
                        </button>
                    </div>
                    <OutputContent output={output} isRunning={isRunning} statusMsg={statusMsg}
                        terminalHistory={terminalHistory} terminalInput={terminalInput}
                        setTerminalInput={setTerminalInput} handleTerminalKeyDown={handleTerminalKeyDown}
                        terminalEndRef={terminalEndRef} terminalInputRef={terminalInputRef}
                        selectedLang={selectedLang} setTerminalHistory={setTerminalHistory}
                        showTerminal={selectedLang.mode === 'client'} />
                </div>
            </div>

            <div className="flex-1 min-h-0 flex md:hidden flex-col overflow-hidden">
                <div style={{ height: '60%' }} className="min-h-0 relative">
                    <Editor
                        height="100%"
                        language={selectedLang.editorLang}
                        value={code}
                        theme="vs-dark"
                        onChange={(val) => setCode(val || '')}
                        options={{
                            minimap: { enabled: false },
                            fontSize: 13,
                            scrollBeyondLastLine: false,
                            padding: { top: 12, bottom: 12 },
                            fontFamily: "'Fira Code', Consolas, monospace",
                            lineNumbers: 'on',
                            renderLineHighlight: 'all',
                            wordWrap: 'on',
                            automaticLayout: true,
                        }}
                    />
                </div>

                <div style={{ height: '40%' }} className="border-t border-white/[0.06] bg-[#0d0d1a] flex flex-col">
                    <div className="h-9 flex items-center justify-between px-3 border-b border-white/[0.06] shrink-0">
                        <div className="flex items-center gap-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                            <Terminal className="w-3.5 h-3.5" />
                            Terminal
                        </div>
                        <button
                            onClick={() => { setOutput(''); setTerminalHistory([]); }}
                            className="text-[10px] text-gray-500 hover:text-white px-1.5 py-0.5 rounded hover:bg-white/[0.06] transition-colors"
                        >
                            Clear
                        </button>
                    </div>
                    <OutputContent output={output} isRunning={isRunning} statusMsg={statusMsg}
                        terminalHistory={terminalHistory} terminalInput={terminalInput}
                        setTerminalInput={setTerminalInput} handleTerminalKeyDown={handleTerminalKeyDown}
                        terminalEndRef={terminalEndRef} terminalInputRef={terminalInputRef}
                        selectedLang={selectedLang} setTerminalHistory={setTerminalHistory}
                        showTerminal={selectedLang.mode === 'client'} />
                </div>
            </div>

            <div className="h-6 bg-[#1e1e32] border-t border-white/[0.06] flex items-center justify-between px-3 text-[10px] text-gray-500 shrink-0 select-none">
                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5">
                        <span className="text-sm leading-none">{selectedLang.icon}</span>
                        {selectedLang.name}
                    </span>
                    <span>•</span>
                    <span>{code.split('\n').length} lines</span>
                    <span>•</span>
                    <span className={`flex items-center gap-1 ${selectedLang.mode === 'client' ? 'text-emerald-500' : 'text-amber-500'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${selectedLang.mode === 'client' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        {selectedLang.mode === 'client' ? 'Local' : 'Piston API'}
                    </span>
                </div>
                <span className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                    {isRunning ? (statusMsg || 'Running') : 'Ready'}
                </span>
            </div>
        </div>
    );
}

function OutputContent({ output, isRunning, statusMsg, terminalHistory, terminalInput, setTerminalInput, handleTerminalKeyDown, terminalEndRef, terminalInputRef, selectedLang, setTerminalHistory, showTerminal }) {
    return (
        <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 p-3 overflow-auto font-mono text-[12px] leading-relaxed min-h-0">
                {isRunning ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
                        <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                        <span className="text-xs">{statusMsg || 'Running...'}</span>
                    </div>
                ) : output ? (
                    <pre className={`whitespace-pre-wrap break-words ${output.includes('❌') || output.includes('Error') ? 'text-rose-300' : 'text-gray-200'}`}>
                        {output}
                    </pre>
                ) : !showTerminal ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-600 gap-2">
                        <Terminal className="w-8 h-8 opacity-20" />
                        <span className="text-xs">Click Run to execute</span>
                    </div>
                ) : null}

                {showTerminal && !isRunning && (
                    <div className="mt-2">
                        {terminalHistory.map((entry, i) => (
                            <div key={i} className={`text-[12px] leading-relaxed ${entry.type === 'input' ? 'text-blue-400' :
                                entry.type === 'error' ? 'text-rose-300' : 'text-gray-200'
                                }`}>
                                <pre className="whitespace-pre-wrap break-words">{entry.text}</pre>
                            </div>
                        ))}
                        <div ref={terminalEndRef} />
                    </div>
                )}
            </div>

            {showTerminal && !isRunning && (
                <div className="border-t border-white/[0.06] bg-[#0a0a18] px-3 py-2 flex items-center gap-2 shrink-0">
                    <span className="text-emerald-400 text-xs font-mono font-bold">
                        {selectedLang?.id === 'python' ? '>>>' : '>'}
                    </span>
                    <input
                        ref={terminalInputRef}
                        type="text"
                        value={terminalInput}
                        onChange={(e) => setTerminalInput(e.target.value)}
                        onKeyDown={handleTerminalKeyDown}
                        placeholder={`Type ${selectedLang?.name || ''} expression...`}
                        className="flex-1 bg-transparent text-gray-200 text-[12px] font-mono outline-none placeholder-gray-600 caret-emerald-400"
                        spellCheck={false}
                        autoComplete="off"
                    />
                    <button
                        onClick={() => setTerminalHistory([])}
                        className="p-1 text-gray-600 hover:text-gray-300 transition-colors"
                        title="Clear terminal (Ctrl+L)"
                    >
                        <Trash2 className="w-3 h-3" />
                    </button>
                </div>
            )}
        </div>
    );
}

function LangOption({ lang, selected, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-white/[0.06] transition-colors ${selected ? 'bg-white/[0.04]' : ''}`}
        >
            <span className="text-lg leading-none">{lang.icon}</span>
            <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-gray-200">{lang.name}</div>
                <div className="text-[10px] text-gray-500">{lang.version}</div>
            </div>
            {selected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
        </button>
    );
}
