import { mockDocuments } from "@/lib/mock-data";

// Manajemen dokumen admin — browse semua status, force-unpublish kapan saja (ARCHITECTURE.md #12).
export default function AdminDocumentsPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold">Manajemen Dokumen</h1>

      <table className="mt-4 w-full text-left text-sm">
        <thead>
          <tr className="border-b" style={{ borderColor: "var(--color-border)" }}>
            <th className="py-2 font-medium">Judul</th>
            <th className="py-2 font-medium">Tipe</th>
            <th className="py-2 font-medium">Status</th>
            <th className="py-2 font-medium">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {mockDocuments.map((doc) => (
            <tr key={doc.id} className="border-b" style={{ borderColor: "var(--color-border)" }}>
              <td className="py-2">{doc.title}</td>
              <td className="py-2 uppercase">{doc.fileType}</td>
              <td className="py-2">{doc.status}</td>
              <td className="py-2">
                <button className="text-sm underline">Unpublish</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
