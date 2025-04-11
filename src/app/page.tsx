"use client";

import DataForm from "@/components/data-form";
import ProductDataForm from "@/components/product-data-form";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [formType, setFormType] = useState<"customer" | "product">("customer");

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <main className="flex flex-col items-center justify-center w-full flex-1 px-20 text-center">
        <h1 className="text-4xl font-bold">DataForm</h1>
        <p className="mt-3 text-2xl">
          Formate seus dados facilmente com nossa ferramenta de formatação de dados.
        </p>

        <div className="flex justify-center space-x-4 mt-4">
          <Button
            variant={formType === "customer" ? "default" : "secondary"}
            onClick={() => setFormType("customer")}
          >
            batata
          </Button>
          <Button
            variant={formType === "product" ? "default" : "secondary"}
            onClick={() => setFormType("product")}
          >
            Formatar Dados de Produtos
          </Button>
        </div>

        {formType === "customer" ? <DataForm /> : <ProductDataForm />}
      </main>
    </div>
  );
}


