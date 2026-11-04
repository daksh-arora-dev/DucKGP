import { Children, isValidElement, memo, useState, type ReactElement, type ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { Check, ChevronDown, Copy, ExternalLink } from 'lucide-react';
import 'katex/dist/katex.min.css';
import 'highlight.js/styles/github-dark.css';

/** Untrusted model output: raw HTML is never enabled, and the schema is sanitized before math/highlight run. */
const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code ?? []), ['className', 'math-inline', 'math-display']],
  },
};

function textOf(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (isValidElement(node)) return textOf((node as ReactElement<{ children?: ReactNode }>).props.children);
  return '';
}

function CodeBlock({ children }: { children?: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const child = Children.toArray(children)[0] as ReactElement<{ className?: string; children?: ReactNode }> | undefined;
  const lang = /language-([\w+-]+)/.exec(child?.props?.className ?? '')?.[1] ?? 'text';
  const code = textOf(child?.props?.children).replace(/\n$/, '');
  const long = code.split('\n').length > 24;
  async function copy() {
    try { await navigator.clipboard.writeText(code); setCopied(true); window.setTimeout(() => setCopied(false), 1500); } catch { /* clipboard unavailable */ }
  }
  return (
    <div className="code-block">
      <div className="code-head">
        <span>{lang}</span>
        <button type="button" onClick={() => { void copy(); }} aria-label="Copy code">{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? 'Copied' : 'Copy'}</button>
      </div>
      <pre className={long && !expanded ? 'clamped' : ''}>{children}</pre>
      {long && <button type="button" className="code-more" onClick={() => setExpanded(!expanded)}><ChevronDown size={13} className={expanded ? 'flip' : ''} />{expanded ? 'Collapse' : 'Show all lines'}</button>}
    </div>
  );
}

const components: Components = {
  a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer nofollow">{children}<ExternalLink size={11} /></a>,
  pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
  table: ({ children }) => <div className="table-wrap"><table>{children}</table></div>,
};

const Markdown = memo(function Markdown({ children }: { children: string }) {
  return (
    <div className="md">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[[rehypeSanitize, schema], rehypeKatex, [rehypeHighlight, { detect: false, ignoreMissing: true }]]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
});
export default Markdown;
