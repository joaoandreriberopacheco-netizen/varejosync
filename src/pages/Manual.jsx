import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, UserPlus, Users, Shield } from 'lucide-react';

export default function Manual() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 p-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Manual de Multi-Inquilino</h1>
        <p className="text-muted-foreground text-lg">Entenda como funciona a criação e gestão de empresas e usuários no sistema.</p>
      </div>

      <div className="grid gap-6">
        
        {/* Conceito */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Shield className="w-5 h-5 text-indigo-600" />
              Conceito
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground/90 leading-relaxed">
              O sistema utiliza uma arquitetura <strong>Multi-Tenant Lógico</strong>. 
              Isso significa que todos os dados estão na mesma plataforma, mas são rigorosamente segregados pelo identificador da empresa.
              Cada usuário pertence a uma empresa e só pode ver os dados dela.
            </p>
          </CardContent>
        </Card>

        {/* Novo Inquilino */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Building2 className="w-5 h-5 text-green-600" />
              Como criar uma Nova Empresa (Novo Inquilino)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg border border-green-100">
              <p className="font-medium text-green-800">O processo é automático no primeiro login.</p>
            </div>
            <ol className="list-decimal pl-5 space-y-3 text-foreground/90">
              <li>
                <strong>Acesse com um email inédito:</strong> Na tela de login, utilize um email que nunca foi cadastrado no sistema.
              </li>
              <li>
                <strong>Criação Automática:</strong> O sistema detectará que é um novo usuário sem vínculo.
              </li>
              <li>
                <strong>Ambiente Pronto:</strong> Uma nova empresa (ex: "Minha Empresa") será criada instantaneamente e você será o <strong>Admin</strong>.
              </li>
              <li>
                <strong>Configure:</strong> Vá em <em>Configurações {'>'} Dados da Empresa</em> para personalizar seus dados.
              </li>
            </ol>
          </CardContent>
        </Card>

        {/* Adicionar Usuários */}
        <Card className="border-l-4 border-l-sky-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <UserPlus className="w-5 h-5 text-sky-600" />
              Como adicionar usuários à sua Empresa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-foreground/90">
              Para que outras pessoas acessem <strong>a sua empresa</strong>, você deve convidá-las:
            </p>
            <ol className="list-decimal pl-5 space-y-3 text-foreground/90">
              <li>
                Faça login como <strong>Admin</strong>.
              </li>
              <li>
                Vá em <strong>Configurações {'>'} Cadastro de Usuários</strong>.
              </li>
              <li>
                Clique em <strong>Novo Usuário</strong>.
              </li>
              <li>
                Preencha o <strong>Email</strong> e o Cargo do colaborador.
              </li>
              <li>
                <strong>Pronto!</strong> Quando essa pessoa fizer login com o email cadastrado, ela entrará automaticamente no ambiente da sua empresa.
              </li>
            </ol>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}