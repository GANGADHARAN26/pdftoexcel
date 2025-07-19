"use client";

import React, { useState, useCallback, useRef } from "react";

import toast from "react-hot-toast";
import ExcelJS from "exceljs";
import {
  Check,
  Copy,
  Download,
  Grid,
  Minus,
  Plus,
  RotateCcw,
  Save,
  X,
  ClipboardCopy,
} from "lucide-react";

const ManualTableEditor = ({
  initialData = null,
  onSave,
  onCancel,
  documentType = "general",
}) => {
  const [tableData, setTableData] = useState(
    initialData || [
      ["Column 1", "Column 2", "Column 3"],
      ["", "", ""],
      ["", "", ""],
    ]
  );
  const [selectedCell, setSelectedCell] = useState({ row: 0, col: 0 });
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [clipboard, setClipboard] = useState("");
  const [tableName, setTableName] = useState("Financial Data");
  const [isEditing, setIsEditing] = useState(false);
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const editInputRef = useRef(null);

  const financialTemplates = {
    bankStatement: {
      name: "Bank Statement",
      headers: ["Date", "Description", "Amount", "Balance"],
      sampleData: [
        ["2024-01-15", "Opening Balance", "", "1,000.00"],
        ["2024-01-16", "Deposit", "500.00", "1,500.00"],
        ["2024-01-17", "Withdrawal", "-200.00", "1,300.00"],
      ],
    },
    financialReport: {
      name: "Financial Report",
      headers: ["Item", "Current Year", "Previous Year", "Change %"],
      sampleData: [
        ["Revenue", "100,000", "90,000", "11.1%"],
        ["Expenses", "70,000", "65,000", "7.7%"],
        ["Net Income", "30,000", "25,000", "20.0%"],
      ],
    },
    invoice: {
      name: "Invoice",
      headers: ["Description", "Quantity", "Unit Price", "Total"],
      sampleData: [
        ["Product A", "2", "50.00", "100.00"],
        ["Product B", "1", "75.00", "75.00"],
        ["Subtotal", "", "", "175.00"],
      ],
    },
    investment: {
      name: "Investment Portfolio",
      headers: ["Security", "Shares", "Price", "Market Value"],
      sampleData: [
        ["AAPL", "100", "150.00", "15,000.00"],
        ["GOOGL", "50", "2,500.00", "125,000.00"],
        ["MSFT", "75", "300.00", "22,500.00"],
      ],
    },
  };

  const saveToUndoStack = useCallback(() => {
    setUndoStack((prev) => [
      ...prev.slice(-9),
      [...tableData.map((row) => [...row])],
    ]);
    setRedoStack([]);
  }, [tableData]);

  const addRow = useCallback(() => {
    saveToUndoStack();
    const newRow = new Array(tableData[0].length).fill("");
    setTableData((prev) => [...prev, newRow]);
    toast.success("Row added successfully!");
  }, [tableData, saveToUndoStack]);

  const addColumn = useCallback(() => {
    saveToUndoStack();
    setTableData((prev) => prev.map((row) => [...row, ""]));
    toast.success("Column added successfully!");
  }, [saveToUndoStack]);

  const deleteRow = useCallback(
    (rowIndex) => {
      if (tableData.length <= 1) {
        toast.error("Cannot delete the last row!");
        return;
      }
      saveToUndoStack();
      setTableData((prev) => prev.filter((_, index) => index !== rowIndex));
      toast.success("Row deleted successfully!");
    },
    [tableData, saveToUndoStack]
  );

  const deleteColumn = useCallback(
    (colIndex) => {
      if (tableData[0].length <= 1) {
        toast.error("Cannot delete the last column!");
        return;
      }
      saveToUndoStack();
      setTableData((prev) =>
        prev.map((row) => row.filter((_, index) => index !== colIndex))
      );
      toast.success("Column deleted successfully!");
    },
    [tableData, saveToUndoStack]
  );

  const updateCell = useCallback((row, col, value) => {
    setTableData((prev) => {
      const newData = [...prev];
      newData[row] = [...newData[row]];
      newData[row][col] = value;
      return newData;
    });
  }, []);

  const startEditing = useCallback(
    (row, col) => {
      setEditingCell({ row, col });
      setEditValue(tableData[row][col]);
      setIsEditing(true);
      setTimeout(() => editInputRef.current?.focus(), 0);
    },
    [tableData]
  );

  const saveEdit = useCallback(() => {
    if (editingCell) {
      saveToUndoStack();
      updateCell(editingCell.row, editingCell.col, editValue);
      setEditingCell(null);
      setEditValue("");
      setIsEditing(false);
      toast.success("Cell updated!");
    }
  }, [editingCell, editValue, updateCell, saveToUndoStack]);

  const cancelEdit = useCallback(() => {
    setEditingCell(null);
    setEditValue("");
    setIsEditing(false);
  }, []);

  const copyCell = useCallback(() => {
    if (selectedCell) {
      const value = tableData[selectedCell.row][selectedCell.col];
      setClipboard(value);
      toast.success("Cell copied!");
    }
  }, [selectedCell, tableData]);

  const pasteCell = useCallback(() => {
    if (selectedCell && clipboard) {
      saveToUndoStack();
      updateCell(selectedCell.row, selectedCell.col, clipboard);
      toast.success("Cell pasted!");
    }
  }, [selectedCell, clipboard, updateCell, saveToUndoStack]);

  const undo = useCallback(() => {
    if (undoStack.length > 0) {
      const previousState = undoStack[undoStack.length - 1];
      setRedoStack((prev) => [...prev, [...tableData.map((row) => [...row])]]);
      setTableData(previousState);
      setUndoStack((prev) => prev.slice(0, -1));
      toast.success("Undo successful!");
    }
  }, [undoStack, tableData]);

  const redo = useCallback(() => {
    if (redoStack.length > 0) {
      const nextState = redoStack[redoStack.length - 1];
      setUndoStack((prev) => [...prev, [...tableData.map((row) => [...row])]]);
      setTableData(nextState);
      setRedoStack((prev) => prev.slice(0, -1));
      toast.success("Redo successful!");
    }
  }, [redoStack, tableData]);

  const loadTemplate = useCallback(
    (templateKey) => {
      const template = financialTemplates[templateKey];
      if (template) {
        saveToUndoStack();
        const newData = [template.headers, ...template.sampleData];
        setTableData(newData);
        setTableName(template.name);
        toast.success(`${template.name} template loaded!`);
      }
    },
    [saveToUndoStack, financialTemplates]
  );

  const exportToExcel = useCallback(async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(tableName);

      // Add data to worksheet
      tableData.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
          const excelCell = worksheet.getCell(rowIndex + 1, colIndex + 1);
          excelCell.value = cell;

          // Style header row
          if (rowIndex === 0) {
            excelCell.font = { bold: true };
            excelCell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFE6F2FF" },
            };
          }

          // Add borders
          excelCell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        });
      });

      // Auto-fit columns
      worksheet.columns.forEach((column) => {
        column.width = 15;
      });

      // Generate buffer and download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${tableName.replace(
        /\s+/g,
        "_"
      )}_manual_extraction.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Excel file downloaded successfully!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export Excel file");
    }
  }, [tableData, tableName]);

  const handleKeyDown = useCallback(
    (e) => {
      if (isEditing) {
        if (e.key === "Enter") {
          e.preventDefault();
          saveEdit();
        } else if (e.key === "Escape") {
          e.preventDefault();
          cancelEdit();
        }
        return;
      }

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          setSelectedCell((prev) => ({
            ...prev,
            row: Math.max(0, prev.row - 1),
          }));
          break;
        case "ArrowDown":
          e.preventDefault();
          setSelectedCell((prev) => ({
            ...prev,
            row: Math.min(tableData.length - 1, prev.row + 1),
          }));
          break;
        case "ArrowLeft":
          e.preventDefault();
          setSelectedCell((prev) => ({
            ...prev,
            col: Math.max(0, prev.col - 1),
          }));
          break;
        case "ArrowRight":
          e.preventDefault();
          setSelectedCell((prev) => ({
            ...prev,
            col: Math.min(tableData[0].length - 1, prev.col + 1),
          }));
          break;
        case "Enter":
          e.preventDefault();
          startEditing(selectedCell.row, selectedCell.col);
          break;
        case "Delete":
          e.preventDefault();
          saveToUndoStack();
          updateCell(selectedCell.row, selectedCell.col, "");
          break;
        case "F2":
          e.preventDefault();
          startEditing(selectedCell.row, selectedCell.col);
          break;
      }

      // Ctrl shortcuts
      if (e.ctrlKey) {
        switch (e.key) {
          case "c":
            e.preventDefault();
            copyCell();
            break;
          case "v":
            e.preventDefault();
            pasteCell();
            break;
          case "z":
            e.preventDefault();
            undo();
            break;
          case "y":
            e.preventDefault();
            redo();
            break;
        }
      }
    },
    [
      isEditing,
      selectedCell,
      tableData,
      startEditing,
      saveEdit,
      cancelEdit,
      copyCell,
      pasteCell,
      undo,
      redo,
      saveToUndoStack,
      updateCell,
    ]
  );

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Grid className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">
            Manual Table Editor
          </h2>
          <div className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
            Development Mode
          </div>
        </div>
        <input
          type="text"
          value={tableName}
          onChange={(e) => setTableName(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Table Name"
        />
      </div>

      {/* Templates */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-3">
          Financial Document Templates:
        </h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(financialTemplates).map(([key, template]) => (
            <button
              key={key}
              onClick={() => loadTemplate(key)}
              className="px-3 py-2 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors text-sm"
            >
              {template.name}
            </button>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 mb-6 p-4 bg-gray-50 rounded-lg">
        <button
          onClick={addRow}
          className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Row
        </button>
        <button
          onClick={addColumn}
          className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Column
        </button>
        <button
          onClick={() => deleteRow(selectedCell.row)}
          className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors"
        >
          <Minus className="w-4 h-4" />
          Delete Row
        </button>
        <button
          onClick={() => deleteColumn(selectedCell.col)}
          className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 transition-colors"
        >
          <Minus className="w-4 h-4" />
          Delete Column
        </button>
        <div className="border-l border-gray-300 mx-2"></div>
        <button
          onClick={copyCell}
          className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors"
        >
          <Copy className="w-4 h-4" />
          Copy
        </button>
        <button
          onClick={pasteCell}
          className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors"
        >
          <ClipboardCopy className="w-4 h-4" />
          Paste
        </button>
        <div className="border-l border-gray-300 mx-2"></div>
        <button
          onClick={undo}
          disabled={undoStack.length === 0}
          className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          <RotateCcw className="w-4 h-4" />
          Undo
        </button>
        <button
          onClick={redo}
          disabled={redoStack.length === 0}
          className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          <RotateCcw className="w-4 h-4 transform scale-x-[-1]" />
          Redo
        </button>
      </div>

      {/* Instructions */}
      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h4 className="font-semibold text-yellow-800 mb-2">📝 Instructions:</h4>
        <ul className="text-sm text-yellow-700 space-y-1">
          <li>
            • Click on a cell to select it, double-click or press Enter to edit
          </li>
          <li>• Use arrow keys to navigate between cells</li>
          <li>• Press Delete to clear a cell, F2 to edit</li>
          <li>• Ctrl+C to copy, Ctrl+V to paste, Ctrl+Z to undo</li>
          <li>• Load financial templates for common document types</li>
        </ul>
      </div>

      {/* Table */}
      <div
        className="border border-gray-300 rounded-lg overflow-hidden mb-6"
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        <table className="w-full">
          <tbody>
            {tableData.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, colIndex) => (
                  <td
                    key={colIndex}
                    className={`border border-gray-300 p-2 min-w-[120px] h-10 relative ${
                      selectedCell.row === rowIndex &&
                      selectedCell.col === colIndex
                        ? "bg-blue-100 border-blue-500"
                        : rowIndex === 0
                        ? "bg-gray-50 font-semibold"
                        : "bg-white hover:bg-gray-50"
                    }`}
                    onClick={() =>
                      setSelectedCell({ row: rowIndex, col: colIndex })
                    }
                    onDoubleClick={() => startEditing(rowIndex, colIndex)}
                  >
                    {editingCell?.row === rowIndex &&
                    editingCell?.col === colIndex ? (
                      <div className="flex items-center gap-1">
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full px-1 py-0 border-none outline-none focus:ring-0"
                          onKeyDown={handleKeyDown}
                        />
                        <button
                          onClick={saveEdit}
                          className="text-green-600 hover:text-green-800"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="truncate">{cell}</div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6 mb-6 text-sm text-gray-600">
        <div>Rows: {tableData.length}</div>
        <div>Columns: {tableData[0]?.length || 0}</div>
        <div>
          Selected: Row {selectedCell.row + 1}, Column {selectedCell.col + 1}
        </div>
        <div>Total Cells: {tableData.length * (tableData[0]?.length || 0)}</div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-end">
        <button
          onClick={onCancel}
          className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
        <button
          onClick={() => onSave && onSave(tableData, tableName)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Save className="w-4 h-4" />
          Save Data
        </button>
        <button
          onClick={exportToExcel}
          className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export Excel
        </button>
      </div>
    </div>
  );
};

export default ManualTableEditor;
