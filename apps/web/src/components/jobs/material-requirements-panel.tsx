'use client';

type MaterialRow = {
  id: string;
  name?: string;
  quantity: number;
  status: string;
};

export function MaterialRequirementsPanel({ materials }: { materials: MaterialRow[] }) {
  if (!materials.length) {
    return (
      <div className="card p-4">
        <h3 className="text-sm font-semibold">Required materials</h3>
        <p className="mt-2 text-sm text-muted-foreground">No materials allocated yet.</p>
      </div>
    );
  }

  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold">Required materials</h3>
      <table className="mt-3 w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="pb-2 font-medium">Item</th>
            <th className="pb-2 font-medium">Qty</th>
            <th className="pb-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {materials.map((m) => (
            <tr key={m.id} className="border-b last:border-0">
              <td className="py-2">{m.name ?? 'Item'}</td>
              <td className="py-2">{m.quantity}</td>
              <td className="py-2 capitalize">{m.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
