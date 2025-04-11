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
    return <p>Nenhum dado para exibir.</p>;
  }

  const headers = Object.keys(data[0]);

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableCaption>Uma prévia dos dados formatados.</TableCaption>
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
        // Initialize column mappings with default strings
        const initialMappings: { [key: string]: string } = {};
        Object.keys(parsedData[0]).forEach((key) => {
          initialMappings[key] = "Descartar";
        });
        setColumnMappings(initialMappings);
      } else {
        toast({
          title: "Erro",
          description: "Não foi possível analisar o arquivo CSV.",
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
      const currentLine = lines[i].split(",");
      for (let j = 0; j < headers.length; j++) {
        obj[headers[j]] = currentLine[j] ? currentLine[j].trim() : "";
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
  };

  const formatData = () => {
    const formatted: any[] = csvData.map((item) => {
      const newItem: { [key: string]: string } = {};
      Object.keys(item).forEach(originalColumn => {
        const targetColumn = columnMappings[originalColumn];
        if (targetColumn && targetColumn !== "Descartar") {
          newItem[targetColumn] = item[originalColumn] || '';
        }
      });

      Object.keys(concatenationRules).forEach((targetColumn) => {
        if (targetColumn !== "Descartar") {
          const selectedColumns = concatenationRules[targetColumn];
          if (selectedColumns && selectedColumns.length > 0) {
            try {
              newItem[targetColumn] = selectedColumns
                .map((col) => item[col.column] || "")
                .join(" ");
            } catch (error) {
              console.error("Error evaluating rule:", error);
              toast({
                title: "Erro",
                description: `Erro ao avaliar a regra para a coluna ${targetColumn}.`,
                variant: "destructive",
              });
              newItem[targetColumn] = "Error";
            }
          }
        }
      });
      return newItem;
    });
    setFormattedData(formatted);
  };

  const downloadCSV = () => {
    if (formattedData.length === 0) {
      toast({
        title: "Aviso",
        description: "Nenhum dado para baixar. Formate os dados primeiro.",
      });
      return;
    }

    const csv = arrayToCsv(formattedData);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("href", url);
    a.setAttribute("download", "dados_formatados.csv");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast({
      title: "Sucesso",
      description: "Dados baixados com sucesso.",
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
        title: "Aviso",
        description: "Nenhum dado para copiar. Formate os dados primeiro.",
      });
      return;
    }

    const csvString = arrayToCsv(formattedData);
    navigator.clipboard
      .writeText(csvString)
      .then(() => {
        toast({
          title: "Sucesso",
          description: "Dados copiados para a área de transferência!",
        });
      })
      .catch((err) => {
        toast({
          title: "Erro",
          description: "Falha ao copiar dados para a área de transferência.",
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
    "Descartar",
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
        <Label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mr-2" style={{fontSize: '16px'}} htmlFor="csvUpload">
          Carregar Arquivo CSV:
        </Label>
        <Input
          type="file"
          id="csvUpload"
          accept=".csv, .xlsx"
          onChange={handleFileChange}
          className="mb-2"
        />
        {csvFile && <p>Arquivo selecionado: {csvFile.name}</p>}
      </div>

      {csvData.length > 0 && (
        <>
          <div className="mb-4">
            <h2>Mapeamento de Colunas</h2>
            <p>Mapeie as colunas de origem para as colunas de destino.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.keys(csvData[0]).map((header) => (
                <div key={header} className="flex flex-col">
                  <Label htmlFor={`mapping-${header}`} className="mb-1">
                    {header}
                  </Label>
                  <Select
                    id={`mapping-${header}`}
                    className="p-2 rounded bg-muted"
                    defaultValue="Descartar"
                    onValueChange={(value) =>
                      handleColumnMappingChange(header, value)
                    }
                  >
                    <SelectTrigger className="bg-muted">
                      <SelectValue placeholder="Selecione a Coluna de Destino"  />
                    </SelectTrigger>
                    <SelectContent className="bg-muted">
                      {
                        (() => {
                          const usedColumns = new Set<string>();
                          return (
                            targetColumns.map((col) => {
                              if (usedColumns.has(col)) {
                                return null;
                              }
                              usedColumns.add(col);
                              return (
                                <SelectItem key={col} value={col}>{col}</SelectItem>
                              );
                            })
                          )
                        })()
                      }
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <h2>Regras de Concatenação</h2>
            <p>Defina as regras para concatenar múltiplas colunas em uma única coluna de destino.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {targetColumns
                .filter((col) => col !== "Descartar")
                .map((col) => (
                  <div key={col} className="mb-2">
                    <Label htmlFor={`rule-${col}`}>{col} Colunas:</Label>
                    <div className="grid grid-cols-3 gap-2 p-4 rounded-md bg-muted">
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
                                defaultValue={getColumnOrder(col, header)?.toString() || ""}
                                onValueChange={(value) => {
                                  const order = parseInt(value, 10);
                                  handleConcatenationOrderChange(col, header, order);
                                }}
                              >
                                <SelectTrigger className="w-[80px] bg-muted">
                                  <SelectValue placeholder="Ordem" />
                                </SelectTrigger>
                                <SelectContent className="bg-muted">
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
          </div>

          <Button
            onClick={formatData}
            className="mb-4 bg-accent text-white hover:bg-teal-700"
          >
            Formatar Dados
          </Button>
        </>
      )}

      {formattedData.length > 0 && (
        <>
          <div className="mb-4">
            <h2>Prévia dos Dados</h2>
            <DataTable data={formattedData} />
          </div>

          <div className="flex justify-between">
            <Button
              onClick={downloadCSV}
              className="bg-accent text-white hover:bg-teal-700"
            >
              <Download className="mr-2 h-4 w-4" />
              Baixar CSV
            </Button>
            <Button
              onClick={handleCopyData}
              className={cn("bg-accent text-white hover:bg-teal-700")}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copiar Dados
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default DataForm;

