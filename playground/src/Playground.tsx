import { useState } from "react";
import { Parsely } from "parsely";

const INITIAL_JSON = `{
  "name": "Parsely",
  "ready": false
}
`;

export function Playground() {
  const [content, setContent] = useState(INITIAL_JSON);

  return (
    <main>
      <header>
        <h1>Parsely</h1>
        <p>JSON editor playground</p>
      </header>
      <div className="playground">
        <section aria-label="Editor">
          <Parsely content={content} onContentChanged={setContent} />
        </section>
        <label>
          Raw JSON
          <textarea value={content} onChange={(event) => setContent(event.target.value)} />
        </label>
      </div>
    </main>
  );
}
