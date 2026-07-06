import { formatRupiah, mockTransactions } from "@/lib/mock-data";

// Manajemen transaksi — tombol "cek ulang status" untuk trigger reconciliation manual (ARCHITECTURE.md #12).
export default function AdminTransactionsPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold">Manajemen Transaksi</h1>

      <table className="mt-4 w-full text-left text-sm">
        <thead>
          <tr className="border-b" style={{ borderColor: "var(--color-border)" }}>
            <th className="py-2 font-medium">Order ID</th>
            <th className="py-2 font-medium">Tipe</th>
            <th className="py-2 font-medium">Jumlah</th>
            <th className="py-2 font-medium">Status</th>
            <th className="py-2 font-medium">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {mockTransactions.map((trx) => (
            <tr key={trx.id} className="border-b" style={{ borderColor: "var(--color-border)" }}>
              <td className="py-2">{trx.midtransOrderId}</td>
              <td className="py-2">{trx.type}</td>
              <td className="py-2">{formatRupiah(trx.amount)}</td>
              <td className="py-2">{trx.status}</td>
              <td className="py-2">
                <button className="text-sm underline">Cek ulang status</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
