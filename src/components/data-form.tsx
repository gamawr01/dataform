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
        <TableCaption>Prévia dos dados formatados.</TableCaption>
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
  const [formattedData, setFormattedData] = useState<any[]>([]);
  const { toast } = useToast();
  const [presentColumns, setPresentColumns] = useState<string[]>([]);

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
                  const initialMappings: { [key: string]: string } = {};
                  const columnsWithData = Object.keys(parsedData[0]).filter(key => {
                      return parsedData[0][key] !== null && parsedData[0][key] !== undefined;
                  });

                  columnsWithData.forEach((key) => {
                      initialMappings[key] = "Descartar";
                  });

                  setColumnMappings(initialMappings);
                  setPresentColumns(columnsWithData);
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
                obj[headers[j]] = currentLine[j] ? currentLine[j].trim() : "";
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
                const data: any[] = XLSX.utils.sheet_to_json(worksheet, { raw: true, defval: null });
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

  const formatData = () => {
    const formatted: any[] = csvData.map((item) => {
      const newItem: { [key: string]: string } = {};
      const assignedTargetColumns = new Set<string>();

      Object.keys(item).forEach(originalColumn => {
          const targetColumn = columnMappings[originalColumn];
          let formattedValue = item[originalColumn] !== null && item[originalColumn] !== undefined ? String(item[originalColumn]) : '';
          if (targetColumn && targetColumn !== "Descartar") {
              if (targetColumn === "Número") {
                  formattedValue = (item[originalColumn] !== null && typeof item[originalColumn] === 'string') ? item[originalColumn].replace(/[^0-9]/g, '') : '';
              } else if (targetColumn === "CNPJ/CPF") {
                  formattedValue = (item[originalColumn] !== null && typeof item[originalColumn] === 'string') ? item[originalColumn].replace(/[^0-9]/g, '') : '';
              } else if (targetColumn === "Telefone 1" || targetColumn === "Telefone 2") {
                  formattedValue = (item[originalColumn] !== null && typeof item[originalColumn] === 'string') ? item[originalColumn].replace(/[^0-9]/g, '').substring(0, 11) : '';
              }

              if (!assignedTargetColumns.has(targetColumn)) {
                  newItem[targetColumn] = formattedValue;
                  assignedTargetColumns.add(targetColumn);
              } else {
                  console.warn(`Coluna de destino duplicada detectada: ${targetColumn}. A coluna "${originalColumn}" foi ignorada.`);
              }
          }
      });
       const sortedNewItem: { [key: string]: string } = {};
            Object.keys(newItem)
                .sort()
                .forEach(key => {
                    sortedNewItem[key] = newItem[key];
                });
      return sortedNewItem;
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

    const downloadRules = () => {
        const rules = {
            "automaticCorrections": {
            Número: "Remoção de caracteres não numéricos",
            "CNPJ/CPF": "Remoção de caracteres não numéricos",
            "Telefone 1": "Remoção de caracteres não numéricos e limitação a 11 dígitos",
            "Telefone 2": "Remoção de caracteres não numéricos e limitação a 11 dígitos",
        },
      "targetColumns": [
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
      ]
        };
        const rulesString = JSON.stringify(rules, null, 2);
        const blob = new Blob([rulesString], { type: "text/plain" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.setAttribute("href", url);
        a.setAttribute("download", "regras_de_conversao.txt");
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        toast({
            title: "Sucesso",
            description: "Regras de conversão baixadas com sucesso.",
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

    return (
        <div className="container py-8">
            <div className="mb-4">
                <Label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mr-2" style={{ fontSize: '22px' }} htmlFor="csvUpload">
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
                                            <SelectValue placeholder="Selecione a Coluna de Destino" />
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
                                                             const isPreselected = header === col;
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
                    <h2>Regras de Concatenação</h2>
                    <p>Defina regras para concatenar múltiplas colunas em um único campo de destino.</p>

                    <Button
                        onClick={formatData}
                        className="mb-4 bg-primary text-primary-foreground hover:bg-primary/90"
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
                    <Button
                        onClick={downloadRules}
                        className="bg-gray-500 text-white hover:bg-gray-700 mt-4"
                    >
                        <Download className="mr-2 h-4 w-4" />
                        Baixar Regras de Conversão
                    </Button>
                </>
            )}
        </div>
    );
};

export default DataForm;
