import { base44 } from '@/api/base44Client';

export const getTenantId = () => {
    if (typeof window !== 'undefined') {
        const tenantId = localStorage.getItem('tenant_id');
        return tenantId;
    }
    return null;
};

export const setTenantId = (id) => {
    if (typeof window !== 'undefined') {
        if (id) {
            localStorage.setItem('tenant_id', id);
            console.log("setTenantId: Definido para", id);
        } else {
            localStorage.removeItem('tenant_id');
            console.log("setTenantId: Removido");
        }
    }
};

/**
 * Inicializa o contexto da Organização (Tenant) para o usuário logado.
 * IMPLEMENTAÇÃO ROBUSTA (SAAS V2):
 * 1. Verifica se o usuário já tem 'organization_id' no seu registro (User Entity).
 * 2. Se tiver, usa esse ID como fonte da verdade.
 * 3. Se não tiver, tenta migrar de 'Colaborador' ou cria uma nova Organização.
 */
export const initializeTenant = async (user) => {
    console.log("initializeTenant: Iniciando para", user.email);
    
    try {
        // 1. O "Muro" Automático: Verificar se o usuário já tem o contexto definido no próprio registro
        // Isso elimina a dependência de consultas assíncronas frágeis a outras tabelas
        if (user.organization_id) {
            console.log("✅ Usuário já possui organization_id:", user.organization_id);
            setTenantId(user.organization_id);
            return user.organization_id;
        }

        console.log("⚠️ Usuário sem organization_id. Iniciando processo de vínculo/criação...");

        // 2. Fallback/Migração: Verificar se existe vínculo legado (Colaborador)
        // Isso garante que usuários antigos não percam acesso
        const colaboradores = await base44.entities.Colaborador.filter({ email: user.email });
        
        if (colaboradores.length > 0) {
            const colab = colaboradores[0];
            const empresaId = colab.empresa_id;
            
            if (empresaId) {
                console.log("♻️ Migrando usuário legado. Empresa ID:", empresaId);
                
                // Tenta encontrar ou criar a Organização correspondente
                // Vamos assumir que empresaId é o ID da Organização para manter compatibilidade
                // ATUALIZAR O USUÁRIO para o futuro (Fixing the root cause)
                await base44.auth.updateMe({ organization_id: empresaId });
                
                setTenantId(empresaId);
                return empresaId;
            }
        }

        // 3. Novo Usuário (Zero State): Criar Organização e Vínculo
        console.log("🆕 Criando nova Organização para o usuário...");
        
        const nomeEmpresa = "Minha Empresa (" + (user.full_name || "Admin") + ")";
        
        // A. Cria a Organização (Entidade Mestre)
        const novaOrg = await base44.entities.Organization.create({
            name: nomeEmpresa,
            plan_type: "Basic",
            active: true
        });
        
        console.log("🏢 Organização criada:", novaOrg.id);

        // B. Cria DadosEmpresa (Legado/Compatibilidade)
        // Mantemos isso para não quebrar telas que usam DadosEmpresa
        // Podemos usar o MESMO ID se o backend permitisse, mas como são entidades diferentes, criamos um link implícito
        // Na verdade, vamos usar o ID da Organização como o "Tenant ID" universal.
        // Mas para garantir que 'DadosEmpresa' exista para edição de endereço, etc:
        await base44.entities.DadosEmpresa.create({
            razao_social: nomeEmpresa,
            email: user.email,
            data_abertura: new Date().toISOString().split('T')[0],
            // Idealmente vincularíamos o ID aqui, mas vamos usar o contexto do tenant para filtrar
            // O backend functions cuidaria disso, mas no front, vamos confiar que o próximo save usará o ID correto
        });

        // C. Cria Colaborador (Legado/Compatibilidade)
        await base44.entities.Colaborador.create({
            empresa_id: novaOrg.id, // Usando o ID da organização como o ID unificador
            nome: user.full_name || "Admin",
            email: user.email,
            cargo: "Admin",
            perfil: "Admin",
            ativo: true,
            limite_desconto: 100,
            acesso_config: true
        });

        // D. CRUCIAL: Atualiza o Usuário com o ID da Organização (O Vínculo Definitivo)
        await base44.auth.updateMe({ organization_id: novaOrg.id });
        
        console.log("🔒 Vínculo User -> Organization estabelecido com sucesso.");

        setTenantId(novaOrg.id);
        return novaOrg.id;

    } catch (error) {
        console.error("❌ Erro fatal em initializeTenant:", error);
        throw error;
    }
};