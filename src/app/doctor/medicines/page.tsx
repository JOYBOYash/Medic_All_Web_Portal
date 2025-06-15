"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Medicine } from "@/types/homeoconnect";
import { zodResolver } from "@hookform/resolvers/zod";
import { MoreHorizontal, PlusCircle, Pill, Edit, Trash2, Save, Search } from "lucide-react";
import React, { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

const medicineFormSchema = z.object({
  id: z.string().optional(), // For editing
  name: z.string().min(2, { message: "Medicine name must be at least 2 characters." }),
  description: z.string().optional(),
});

type MedicineFormValues = z.infer<typeof medicineFormSchema>;

// Mock data - replace with API call
const mockMedicines: Medicine[] = [
  { id: "med1", doctorId: "doc1", name: "Arnica Montana", description: "30C, For bruises and muscle soreness", createdAt: new Date(), updatedAt: new Date() },
  { id: "med2", doctorId: "doc1", name: "Nux Vomica", description: "200CH, For indigestion, irritability", createdAt: new Date(), updatedAt: new Date() },
  { id: "med3", doctorId: "doc1", name: "Pulsatilla", description: "6X, For colds with thick yellow discharge, weepy", createdAt: new Date(), updatedAt: new Date() },
  { id: "med4", doctorId: "doc1", name: "Sulphur", description: "1M, For skin issues, burning sensations", createdAt: new Date(), updatedAt: new Date() },
];

export default function DoctorMedicinesPage() {
  const [medicines, setMedicines] = useState<Medicine[]>(mockMedicines);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const form = useForm<MedicineFormValues>({
    resolver: zodResolver(medicineFormSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });
  
  React.useEffect(() => {
    if (editingMedicine) {
      form.reset({
        id: editingMedicine.id,
        name: editingMedicine.name,
        description: editingMedicine.description || "",
      });
    } else {
      form.reset({ name: "", description: "" });
    }
  }, [editingMedicine, form, isDialogOpen]);


  const onSubmit = async (data: MedicineFormValues) => {
    if (editingMedicine) {
      // Update logic
      setMedicines(prev => prev.map(m => m.id === editingMedicine.id ? { ...m, ...data, updatedAt: new Date() } : m));
      alert(`Medicine "${data.name}" updated (placeholder)!`);
    } else {
      // Create logic
      const newMedicine: Medicine = {
        id: `med${Date.now()}`, // Temporary ID
        doctorId: "doc1", // Placeholder
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      setMedicines(prev => [newMedicine, ...prev]);
      alert(`Medicine "${data.name}" added (placeholder)!`);
    }
    setIsDialogOpen(false);
    setEditingMedicine(null);
    form.reset();
  };

  const handleEdit = (medicine: Medicine) => {
    setEditingMedicine(medicine);
    setIsDialogOpen(true);
  };

  const handleDelete = (medicineId: string) => {
    if (confirm("Are you sure you want to delete this medicine?")) {
      setMedicines(prev => prev.filter(m => m.id !== medicineId));
      alert(`Medicine ${medicineId} deleted (placeholder)`);
    }
  };
  
  const openNewMedicineDialog = () => {
    setEditingMedicine(null);
    form.reset({ name: "", description: "" });
    setIsDialogOpen(true);
  };

  const filteredMedicines = useMemo(() => {
    return medicines.filter(med =>
      med.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (med.description && med.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [medicines, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight text-primary-foreground_dark">Medicine Database</h1>
          <p className="text-muted-foreground">Manage the list of available medicines for prescriptions.</p>
        </div>
        <Button onClick={openNewMedicineDialog}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Medicine
        </Button>
      </div>

      <Card className="shadow-lg">
         <CardHeader>
          <CardTitle className="font-headline">Medicines List</CardTitle>
          <CardDescription>A total of {filteredMedicines.length} medicines available.</CardDescription>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search medicines by name or description..."
              className="w-full pl-10 bg-background border rounded-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredMedicines.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description / Potency / Form</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMedicines.map((medicine) => (
                    <TableRow key={medicine.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium">{medicine.name}</TableCell>
                      <TableCell className="max-w-md truncate" title={medicine.description}>{medicine.description || "N/A"}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleEdit(medicine)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(medicine.id)}
                              className="text-destructive focus:text-destructive focus:bg-destructive/10"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <Pill className="mx-auto h-12 w-12 mb-4" />
              <p className="font-semibold">No medicines found.</p>
              <p>Try adjusting your search or add a new medicine to your database.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-headline">{editingMedicine ? "Edit Medicine" : "Add New Medicine"}</DialogTitle>
            <DialogDescription>
              {editingMedicine ? "Update the details of this medicine." : "Enter the details for the new medicine."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Medicine Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Arnica Montana" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Potency, Form, etc.)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g., 30C, For bruises and muscle soreness" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild>
                   <Button type="button" variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  <Save className="mr-2 h-4 w-4" />
                  {form.formState.isSubmitting ? "Saving..." : (editingMedicine ? "Save Changes" : "Add Medicine")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
