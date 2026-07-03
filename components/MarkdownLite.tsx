// Randare minimală pentru content_pages: doar linii de listă („- ") și **bold**.
// Nu folosește dangerouslySetInnerHTML — textul rămâne mereu escapat de React,
// deci nicio suprafață XSS, indiferent de conținutul din DB.
function renderInlineBold(text: string, keyPrefix: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? (
      <b key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</b>
    ) : (
      <span key={`${keyPrefix}-${i}`}>{part}</span>
    )
  );
}

export default function MarkdownLite({ body }: { body: string }) {
  const lines = body.split('\n').filter((l) => l.trim().length > 0);
  return (
    <ul className="ghid">
      {lines.map((line, i) => (
        <li key={i}>{renderInlineBold(line.replace(/^-\s*/, ''), String(i))}</li>
      ))}
    </ul>
  );
}
