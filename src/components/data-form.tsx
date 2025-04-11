"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Copy, Download, Upload } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DataTableProps {
  data: any[];
}

const DataTable = ({ data }: DataTableProps) => {
  if (!data || data.length === 0) {
    return <p>No data to display.</p>;
  }

  const headers = Object.keys(data[0]);

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableCaption>A preview of the formatted data.</TableCaption>
        <TableHeader>
          <TableRow>
            {headers.map((header) => (
              <TableHead key={header}>{header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, index) => (
            <TableRow key={index}>
              {headers.map((header) => (
                <TableCell key={header}>{row[header]}</TableCell>
              ))}
            </TableRow>
        ))}
        </TableBody>
      </Table>
    </div>
  );
};

const DataForm = () => {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [columnMappings, setColumnMappings] = useState<{
    [key: string]: string;
  }>({});
  const [concatenationRules, setConcatenationRules] = useState<{
    [key: string]: { column: string; order: number }[];
  }>({});
  const [formattedData, setFormattedData] = useState<any[]>([]);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCsvFile(file);
      parseCSV(file);
    }
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const csvText = event.target?.result as string;
      const parsedData = csvToArray(csvText);
      if (parsedData.length > 0) {
        setCsvData(parsedData);
        // Initialize column mappings with empty strings
        const initialMappings: { [key: string]: string } = {};
        Object.keys(parsedData[0]).forEach((key) => {
          initialMappings[key] = "";
        });
        setColumnMappings(initialMappings);
      } else {
        toast({
          title: "Error",
          description: "Could not parse CSV file.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  const csvToArray = (csv: string): any[] => {
    const lines = csv.split("\n");
    const headers = lines[0].split(",").map((header: string) => header.trim());
    const result: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const obj: { [key: string]: string } = {};
      const currentLine = lines[i].split(",").map((item: string) => item.trim());
      for (let j = 0; j < headers.length; j++) {
        obj[headers[j]] = currentLine[j];
      }
      result.push(obj);
    }
    return result;
  };

  const handleColumnMappingChange = (header: string, targetColumn: string) => {
    setColumnMappings((prevMappings) => ({
      ...prevMappings,
      [header]: targetColumn,
    }));

    // Initialize concatenation rules for the target column
    if (targetColumn && targetColumn !== "discard") {
      setConcatenationRules((prevRules) => ({
        ...prevRules,
        [targetColumn]: [],
      }));
    }
  };


  const formatData = () => {
    const formatted: any[] = csvData.map((item) => {
      const newItem: { [key: string]: string } = {};
      Object.keys(columnMappings).forEach((header) => {
        const targetColumn = columnMappings[header];
        if (targetColumn && targetColumn !== "discard") {
          newItem[targetColumn] = item[header] || "";
        }
      });

      Object.keys(concatenationRules).forEach((targetColumn) => {
        if (targetColumn !== "discard") { // Ensure discarded columns are not processed
          const selectedColumns = concatenationRules[targetColumn];
          if (selectedColumns && selectedColumns.length > 0) {
            try {
              newItem[targetColumn] = selectedColumns
                .map((col) => item[col.column] || "")
                .join(" "); // Adjust the join character as needed
            } catch (error) {
              console.error("Error evaluating rule:", error);
              toast({
                title: "Error",
                description: `Error evaluating rule for column ${targetColumn}.`,
                variant: "destructive",
              });
              newItem[targetColumn] = "Error";
            }
          }
        }
      });
      return newItem;
    });

    // Filter out columns mapped to "discard"
    const filteredFormatted = formatted.map(item => {
      const newItem: { [key: string]: string } = {};
      Object.keys(item).forEach(key => {
        // Check if the current key is mapped to 'discard' in columnMappings
        const originalColumn = Object.keys(columnMappings).find(
          k => columnMappings[k] === key
        );
  
        if (!originalColumn || columnMappings[originalColumn] !== 'discard') {
          newItem[key] = item[key];
        }
      });
      return newItem;
    });
    setFormattedData(filteredFormatted);
  };


  const downloadCSV = () => {
    if (formattedData.length === 0) {
      toast({
        title: "Warning",
        description: "No data to download. Format the data first.",
      });
      return;
    }

    const csv = arrayToCsv(formattedData);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("href", url);
    a.setAttribute("download", "formatted_data.csv");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast({
      title: "Success",
      description: "Data downloaded successfully.",
    });
  };

  const arrayToCsv = (data: any[]): string => {
    const csvRows = [];
    if (data.length === 0) return "";

    const headers = Object.keys(data[0]);
    csvRows.push(headers.join(","));

    for (const row of data) {
      const values = headers.map((header) => {
        const cellValue =
          row[header] === null || row[header] === undefined
            ? ""
            : String(row[header]);
        return JSON.stringify(cellValue);
      });
      csvRows.push(values.join(","));
    }
    return csvRows.join("\n");
  };

  const handleCopyData = () => {
    if (formattedData.length === 0) {
      toast({
        title: "Warning",
        description: "No data to copy. Format the data first.",
      });
      return;
    }

    const csvString = arrayToCsv(formattedData);
    navigator.clipboard
      .writeText(csvString)
      .then(() => {
        toast({
          title: "Success",
          description: "Data copied to clipboard!",
        });
      })
      .catch((err) => {
        toast({
          title: "Error",
          description: "Failed to copy data to clipboard.",
          variant: "destructive",
        });
      });
  };

  const targetColumns = [
    "Código",
    "CNPJ/CPF",
    "Razão Social",
    "Nome Fantasia",
    "Inscrição Estadual",
    "RG",
    "Data Nascimento",
    "Rua",
    "Número",
    "Cep",
    "Complemento",
    "Bairro",
    "Cidade",
    "Estado",
    "Telefone 1",
    "Telefone 2",
    "Email",
    "Vendedor",
    "discard",
  ];

  const handleConcatenationOrderChange = (targetColumn: string, header: string, order: number) => {
    setConcatenationRules(prevRules => {
      const newRules = { ...prevRules };
      if (!newRules[targetColumn]) {
        newRules[targetColumn] = [];
      }
      const existingColumnIndex = newRules[targetColumn].findIndex(col => col.column === header);
      if (existingColumnIndex !== -1) {
        newRules[targetColumn][existingColumnIndex] = { column: header, order: order };
      } else {
        newRules[targetColumn].push({ column: header, order: order });
      }
      newRules[targetColumn].sort((a, b) => a.order - b.order);
      return newRules;
    });
  };

  const getColumnOrder = (targetColumn: string, header: string): number | undefined => {
    return concatenationRules[targetColumn]?.find(col => col.column === header)?.order;
  };


  return (
    <div className="container py-8">
      <div className="mb-4">
        <Label htmlFor="csvUpload" className="mr-2">
          Upload CSV File:
        </Label>
        <Input
          type="file"
          id="csvUpload"
          accept=".csv, .xlsx"
          onChange={handleFileChange}
          className="mb-2"
        />
        {csvFile && <p>Selected file: {csvFile.name}</p>}
      </div>

      {csvData.length > 0 && (
        <>
          <div className="mb-4">
            <h2>Column Mapping</h2>
            <p>Map source columns to target columns.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.keys(csvData[0]).map((header) => (
                <div key={header} className="flex flex-col">
                  <Label htmlFor={`mapping-${header}`}>{header}</Label>
                  <Select
                    id={`mapping-${header}`}
                    className="p-2 border rounded"
                    value={columnMappings[header] || ""}
                    onChange={(e) =>
                      handleColumnMappingChange(header, e.target.value)
                    }
                  >
                    <SelectContent>
                      <SelectItem value="">Select Target Column</SelectItem>
                      {targetColumns.map((col) => (
                        <SelectItem key={col} value={col}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <h2>Concatenation Rules</h2>
            <p>Define rules to concatenate multiple columns into a single target column.</p>
            {targetColumns
              .filter((col) => col !== "discard")
              .map((col) => (
                <div key={col} className="mb-2">
                  <Label htmlFor={`rule-${col}`}>{col} Columns:</Label>
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(csvData[0])
                      .filter(header => columnMappings[header] === col)
                      .map(header => {
                        return (
                          <div key={header} className="flex items-center">
                            <Label htmlFor={`order-${col}-${header}`} className="mr-2">
                              {header}
                            </Label>
                            <Select
                              id={`order-${col}-${header}`}
                              onValueChange={(value) => {
                                const order = parseInt(value, 10);
                                // Ensure the selected column is not discarded
                                handleConcatenationOrderChange(col, header, order);
                              }}
                            >
                              <SelectTrigger className="w-[80px]">
                                <SelectValue placeholder="Order" value={getColumnOrder(col, header)?.toString()} />
                              </SelectTrigger>
                              <SelectContent>
                                {[...Array(Object.keys(csvData[0]).length)].map((_, i) => (
                                  <SelectItem key={i + 1} value={(i + 1).toString()}>
                                    {i + 1}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
          </div>

          <Button
            onClick={formatData}
            className="mb-4 bg-accent text-white hover:bg-teal-700"
          >
            Format Data
          </Button>
        </>
      )}

      {formattedData.length > 0 && (
        <>
          <div className="mb-4">
            <h2>Data Preview</h2>
            <DataTable data={formattedData} />
          </div>

          <div className="flex justify-between">
            <Button
              onClick={downloadCSV}
              className="bg-accent text-white hover:bg-teal-700"
            >
              <Download className="mr-2 h-4 w-4" />
              Download CSV
            </Button>
            <Button
              onClick={handleCopyData}
              className={cn("bg-accent text-white hover:bg-teal-700")}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy Data
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default DataForm;
