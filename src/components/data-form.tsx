"use client";

import { useState, useCallback } from "react";
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
import { ai } from '@/ai/ai-instance';
import { suggestDataFormat } from '@/ai/flows/suggest-data-format-flow';
import { useEffect } from 'react';
import * as XLSX from 'xlsx';

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
                <TableCell key={header}>{row[header] || 'NULL'}</TableCell>
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
    const [presentColumns, setPresentColumns] = useState<string[]>([]);
  const [columnMappings, setColumnMappings] = useState<{
    [key: string]: string;
  }>({});
  const [formattedData, setFormattedData] = useState<any[]>([]);
  const { toast } = useToast();
  const [isAiSuggesting, setIsAiSuggesting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          setCsvFile(file);
          parseCSV(file);
      }
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const fileType = file.name.split('.').pop()?.toLowerCase();
            let parsedData: any[];

            if (fileType === 'csv') {
                const csvText = event.target?.result as string;
                parsedData = csvToArray(csvText);
            } else if (fileType === 'xlsx') {
                const buffer = event.target?.result as ArrayBuffer;
                parsedData = await excelToArray(buffer);
            } else {
                toast({
                    title: "Erro",
                    description: "Formato de arquivo não suportado. Use .csv ou .xlsx.",
                    variant: "destructive",
                });
                return;
            }

            if (parsedData.length > 0) {
                setCsvData(parsedData);
                  const initialPresentColumns = Object.keys(parsedData[0]).filter(
                      (key) => parsedData[0][key] !== null && parsedData[0][key] !== undefined && parsedData[0][key] !== ''
                  );
                setPresentColumns(initialPresentColumns);
                const initialMappings: { [key: string]: string } = {};
                  Object.keys(parsedData[0]).forEach((key) => {
                      initialMappings[key] = "Descartar";
                  });
                setColumnMappings(initialMappings);
            } else {
                toast({
                    title: "Erro",
                    description: "Não foi possível analisar o arquivo.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Erro ao analisar o arquivo:", error);
            toast({
                title: "Erro",
                description: "Erro ao analisar o arquivo.",
                variant: "destructive",
            });
        }
    };

    if (file.name.endsWith('.xlsx')) {
        reader.readAsArrayBuffer(file);
    } else {
        reader.readAsText(file);
    }
};

  const csvToArray = (csv: string): any[] => {
      const lines = csv.split("\n");
      const headers = lines[0].split(",").map((header: string) => header.trim());
      const result: any[] = [];

      for (let i = 1; i < lines.length; i++) {
          const obj: { [key: string]: string } = {};
          const currentLine = lines[i].split(",");
          for (let j = 0; j < headers.length; j++) {
              obj[headers[j]] = currentLine[j] ? currentLine[j].trim() : "NULL";
          }
          result.push(obj);
      }
      return result;
  };

    const excelToArray = (buffer: ArrayBuffer): Promise<any[]> => {
        return new Promise((resolve, reject) => {
            try {
                const workbook = XLSX.read(buffer, { type: 'buffer' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const data: any[] = XLSX.utils.sheet_to_json(worksheet, { raw: true, defval: "NULL" });
                resolve(data);
            } catch (error) {
                console.error("Erro ao analisar o arquivo XLSX:", error);
                reject(error);
            }
        });
    };

  const handleColumnMappingChange = (header: string, targetColumn: string) => {
    setColumnMappings((prevMappings) => ({
      ...prevMappings,
      [header]: targetColumn,
    }));
  };

    const formatDate = (dateString: string | null | undefined): string => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                return dateString; // Return the original string if parsing fails
            }
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = String(date.getFullYear());
            return `${day}/${month}/${year}`;
        } catch (error) {
            console.error("Error formatting date:", error);
            return dateString; // Return the original string if formatting fails
        }
    };

  const formatData = () => {
      const formatted: any[] = csvData.map((item) => {
          const newItem: { [key: string]: string } = {};
          Object.keys(item).forEach(key => {
              const targetColumn = columnMappings[key];
              if (targetColumn && targetColumn !== "Descartar") {
                  if (targetColumn === "Data Nascimento") {
                      newItem[targetColumn] = formatDate(item[key]);
                  } else {
                      newItem[targetColumn] = item[key] === 'NULL' ? '' : item[key];
                  }
              }
          });

          const finalItem: { [key: string]: string } = {};
          Object.keys(newItem)
              .sort()
              .forEach(key => {
                  finalItem[key] = newItem[key];
              });
          return finalItem;
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

  const suggestMappings = async () => {
    if (!csvData || csvData.length === 0) {
      toast({
        title: "Aviso",
        description: "Por favor, carregue um arquivo CSV primeiro.",
      });
      return;
    }

    setIsAiSuggesting(true);
    try {
      const csvString = csvData.map(row => Object.values(row).join(',')).join('\n');
      const targetColumnsString = JSON.stringify(targetColumns);
          const presentColumnsString = JSON.stringify(presentColumns);
      const response = await suggestDataFormat({
        csvData: csvString,
        targetColumns: targetColumnsString,
        presentColumns: presentColumnsString,
      });

      if (response && response.columnMappings) {
        setColumnMappings(response.columnMappings);
        toast({
          title: "Sucesso",
          description: "Sugestões de mapeamento aplicadas!",
        });
      } else {
        toast({
          title: "Aviso",
          description: "Não foi possível obter sugestões de mapeamento.",
          variant: "warning",
        });
      }
    } catch (error) {
      console.error("Erro ao obter sugestões de mapeamento:", error);
      toast({
        title: "Erro",
        description: "Erro ao obter sugestões de mapeamento.",
        variant: "destructive",
      });
    } finally {
      setIsAiSuggesting(false);
    }
  };

  return (
    <div className="container py-8">
      <div className="mb-4">
        <Label className="text-base font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mr-2" htmlFor="csvUpload">
          Carregar Arquivo CSV:
        </Label>
        <Input
          type="file"
          id="csvUpload"
          accept=".csv, .xlsx"
          onChange={handleFileChange}
          className="mb-2 bg-muted"
        />
        {csvFile && <p>Arquivo selecionado: {csvFile.name}</p>}
      </div>

      {csvData.length > 0 && (
        <>
          <div className="mb-4">
            <h2>Mapeamento de Colunas</h2>
            <p>Mapeie as colunas de origem para as colunas de destino.</p>
              <Button
                  onClick={suggestMappings}
                  disabled={isAiSuggesting}
                  className="mb-4 bg-accent text-white hover:bg-teal-700"
              >
                  {isAiSuggesting ? "Sugerindo..." : "Sugerir Mapeamento"}
              </Button>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.keys(csvData[0]).map((header) => (
                <div key={header} className="flex flex-col">
                  <Label htmlFor={`mapping-${header}`} className="mb-1">
                    {header}
                  </Label>
                  <Select
                    id={`mapping-${header}`}
                    className="p-2 rounded bg-muted"
                    defaultValue={columnMappings[header] || "Descartar"}
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
                                        <SelectItem key={col} value={col}>
                                            {col}
                                        </SelectItem>
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
