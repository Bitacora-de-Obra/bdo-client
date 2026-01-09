import React, { useState, useEffect } from "react";
import { api, CatalogItem } from "../../src/services/api";
import { XMarkIcon, PlusIcon, TrashIcon } from "../../components/icons/Icon";

interface CatalogManagerProps {
  category: string;
  title: string;
}

const CatalogManager: React.FC<CatalogManagerProps> = ({ category, title }) => {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [newItemName, setNewItemName] = useState("");
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const data = await api.admin.getCatalog(category);
      setItems(data as CatalogItem[]);
    } catch (error) {
      console.error("Error loading catalog:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [category]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    try {
      setAdding(true);
      const newItem = await api.admin.createCatalogItem(category, newItemName.trim());
      setItems((prev) => [...prev, newItem as CatalogItem]);
      setNewItemName("");
    } catch (error) {
      console.error("Error adding item:", error);
      alert("Error al agregar elemento");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este elemento? Ya no aparecerá en las sugerencias.")) return;

    try {
      await api.admin.deleteCatalogItem(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error("Error deleting item:", error);
      alert("Error al eliminar elemento");
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
      
      <form onSubmit={handleAdd} className="flex gap-2 mb-4">
        <input
          type="text"
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          placeholder={`Nuevo ${title.toLowerCase()}...`}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={adding}
        />
        <button
          type="submit"
          disabled={adding || !newItemName.trim()}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          {adding ? "..." : <PlusIcon className="w-5 h-5" />}
          Agregar
        </button>
      </form>

      {loading ? (
        <div className="text-gray-500 text-sm">Cargando...</div>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {items.length === 0 ? (
            <p className="text-gray-400 text-sm italic">No hay elementos configurados</p>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2 bg-gray-50 rounded-md group hover:bg-gray-100 transition-colors"
                title="Visible en listas desplegables"
              >
                <span className="text-gray-700">{item.name}</span>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Eliminar"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default CatalogManager;
