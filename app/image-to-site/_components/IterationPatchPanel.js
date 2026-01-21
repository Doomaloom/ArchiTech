export default function IterationPatchPanel({ patch }) {
  if (!patch) {
    return null;
  }

  return (
    <div className="imageflow-iteration-patch">
      <div className="imageflow-iteration-patch-title">Patch payload</div>
      <pre className="imageflow-iteration-patch-body">
        {JSON.stringify(patch, null, 2)}
      </pre>
    </div>
  );
}
