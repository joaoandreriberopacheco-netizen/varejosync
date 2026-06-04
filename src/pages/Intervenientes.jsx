import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Plus, Search, Edit2, Trash2, Shield, Key } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function IntervenientesPage() {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Fetch Intervenientes
    const { data: intervenientes = [], isLoading } = useQuery({
        queryKey: ['intervenientes'],
        queryFn: () => base44.entities.Interveniente.list(),
    });

    // Mutations
    const createMutation = useMutation({
        mutationFn: (data) => base44.entities.Interveniente.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['intervenientes']);
            toast({ title: "Sucesso", description: "Interveniente criado com sucesso." });
            setIsDialogOpen(false);
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => base44.entities.Interveniente.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['intervenientes']);
            toast({ title: "Sucesso", description: "Interveniente atualizado." });
            setIsDialogOpen(false);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => base44.entities.Interveniente.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries(['intervenientes']);
            toast({ title: "Sucesso", description: "Interveniente removido." });
        }
    });

    const handleSave = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = {
            full_name: formData.get('full_name'),
            pin: formData.get('pin'),
            description: formData.get('description'),
            active: formData.get('active') === 'on',
        };

        if (editingItem) {
            updateMutation.mutate({ id: editingItem.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const filteredItems = intervenientes.filter(item => 
        item.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="container mx-auto p-6 max-w-5xl space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-glacial text-gray-900 dark:text-white">Intervenientes</h1>
                    <p className="text-gray-500 dark:text-gray-400">Gerencie as pessoas autorizadas e seus PINs de segurança.</p>
                </div>
                <Button onClick={() => { setEditingItem(null); setIsDialogOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    <Plus className="w-4 h-4 mr-2" /> Novo Interveniente
                </Button>
            </div>

            <Card className="border-none shadow-sm bg-white dark:bg-gray-800">
                <CardHeader className="pb-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input 
                            placeholder="Buscar por nome ou descrição..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50"
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
                    ) : (
                        <div className="min-w-0 overflow-x-auto -mx-1">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nome</TableHead>
                                    <TableHead>Descrição/Cargo</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredItems.map((item) => (
                                    <TableRow key={item.id} className="border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                                    <Shield className="w-4 h-4" />
                                                </div>
                                                {item.full_name}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-gray-500">{item.description}</TableCell>
                                        <TableCell>
                                            <Badge variant={item.active ? "success" : "secondary"} className={item.active ? "bg-green-100 text-green-700 hover:bg-green-100" : ""}>
                                                {item.active ? "Ativo" : "Inativo"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => { setEditingItem(item); setIsDialogOpen(true); }}>
                                                    <Edit2 className="w-4 h-4 text-gray-500" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => { if(confirm('Tem certeza?')) deleteMutation.mutate(item.id); }}>
                                                    <Trash2 className="w-4 h-4 text-red-400" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {filteredItems.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                                            Nenhum interveniente encontrado.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[425px] bg-white dark:bg-gray-800">
                    <DialogHeader>
                        <DialogTitle>{editingItem ? 'Editar Interveniente' : 'Novo Interveniente'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="full_name">Nome Completo</Label>
                            <Input id="full_name" name="full_name" defaultValue={editingItem?.full_name} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="pin">PIN de Segurança (4-6 dígitos)</Label>
                            <div className="relative">
                                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input id="pin" name="pin" defaultValue={editingItem?.pin} maxLength={6} minLength={4} className="pl-9 font-mono" required />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Cargo / Descrição</Label>
                            <Input id="description" name="description" defaultValue={editingItem?.description} />
                        </div>
                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                            <div className="space-y-0.5">
                                <Label htmlFor="active" className="text-base">Ativo</Label>
                                <p className="text-xs text-gray-500">Permitir autenticação com este PIN</p>
                            </div>
                            <Switch id="active" name="active" defaultChecked={editingItem ? editingItem.active : true} />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">Salvar</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}