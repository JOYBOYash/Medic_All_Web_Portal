
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
import { MoreHorizontal, PlusCircle, Pill, Edit, Trash2, Save, Search, Loader2 } from "lucide-react";
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useAuth } from "@/context/AuthContext";
import { db, MEDICINES_COLLECTION, collection, query, where, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, onSnapshot, orderBy } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation"; 
import { cn } from "@/lib/utils";

const medicineFormSchema = z.object({
  id: z.string().optional(), 
  name: z.string().min(2, { message: "Medicine name must be at least 2 characters." }),
  description: z.string().optional(),
  stock: z.coerce.number().min(0, "Stock cannot be negative."),
});

type MedicineFormValues = z.infer<typeof medicineFormSchema>;

export default function DoctorMedicinesPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);


  const form = useForm<MedicineFormValues>({
    resolver: zodResolver(medicineFormSchema),
    defaultValues: {
      name: "",
      description: "",
      stock: 0,
    },
  });

  useEffect(() => {
    if (authLoading || !user || !db || userProfile?.role !== 'doctor') {
      if (!authLoading) setDataLoading(false);
      return;
    }
    
    setDataLoading(true);
    const q = query(
        collection(db, MEDICINES_COLLECTION), 
        where("doctorId", "==", user.uid),
        orderBy("name")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const fetchedMedicines = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Medicine));
        setMedicines(fetchedMedicines);
        setDataLoading(false);
    }, (error) => {
        console.error("Error fetching medicines in real-time: ", error);
        toast({
            variant: "destructive",
            title: "Error",
            description: error.message.includes("indexes") 
                ? "An index is required to view medicines. Please create it in your Firebase console."
                : "Could not load medicines."
        });
        setDataLoading(false);
    });

    return () => unsubscribe(); // Cleanup listener on component unmount

  }, [user, userProfile, authLoading, toast]);
  
  useEffect(() => {
    if (editingMedicine) {
      form.reset({
        id: editingMedicine.id,
        name: editingMedicine.name,
        description: editingMedicine.description || "",
        stock: editingMedicine.stock || 0,
      });
    } else {
      form.reset({ name: "", description: "", stock: 0 });
    }
  }, [editingMedicine, form, isDialogOpen]);


  const onSubmit = async (data: MedicineFormValues) => {
    if (!user || !db || userProfile?.role !== 'doctor') {
        toast({ variant: "destructive", title: "Unauthorized", description: "You are not authorized." });
        return;
    }
    setIsSubmittingForm(true);
    try {
        if (editingMedicine && editingMedicine.id) {
            const medDocRef = doc(db, MEDICINES_COLLECTION, editingMedicine.id);
            const updateData = { ...data, doctorId: editingMedicine.doctorId, updatedAt: serverTimestamp() };
            delete updateData.id; 
            await updateDoc(medDocRef, updateData);
            toast({ title: "Success", description: `Medicine "${data.name}" updated.` });
        } else {
            const newMedicineData = {
                ...data,
                doctorId: user.uid, 
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };
            delete newMedicineData.id; 
            await addDoc(collection(db, MEDICINES_COLLECTION), newMedicineData);
            toast({ title: "Success", description: `Medicine "${data.name}" added.`});
        }
        setIsDialogOpen(false);
        setEditingMedicine(null);
        form.reset();
    } catch (error) {
        console.error("Error saving medicine: ", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to save medicine." });
    } finally {
      setIsSubmittingForm(false);
    }
  };

  const handleEdit = (medicine: Medicine) => {
    setEditingMedicine(medicine);
    setIsDialogOpen(true);
  };

  const handleDelete = async (medicineId: string) => {
    if (!user || !db || userProfile?.role !== 'doctor') {
        toast({ variant: "destructive", title: "Unauthorized", description: "You are not authorized." });
        return;
    }
    if (confirm("Are you sure you want to delete this medicine? This action cannot be undone.")) {
      try {
        await deleteDoc(doc(db, MEDICINES_COLLECTION, medicineId));
        toast({ title: "Success", description: "Medicine deleted." });
      } catch (error) {
        console.error("Error deleting medicine: ", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to delete medicine." });
      }
    }
  };
  
  const openNewMedicineDialog = () => {
    setEditingMedicine(null);
    form.reset({ name: "", description: "", stock: 0 }); 
    setIsDialogOpen(true);
  };

  const filteredMedicines = useMemo(() => {
    return medicines.filter(med =>
      med.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (med.description && med.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [medicines, searchTerm]);

  if (authLoading) {
    return (
        <div className="flex h-full w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline tracking-tight text-primary-foreground_dark">Medicine Database</h1>
          <p className="text-muted-foreground">Manage the list of available medicines and their stock.</p>
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
          {dataLoading ? (
            <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : filteredMedicines.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description / Potency / Form</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMedicines.map((medicine) => (
                    <TableRow key={medicine.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium">{medicine.name}</TableCell>
                      <TableCell className="max-w-md truncate" title={medicine.description}>{medicine.description || "N/A"}</TableCell>
                      <TableCell className={cn(
                        "font-semibold",
                        medicine.stock < 10 && "text-destructive",
                        medicine.stock >= 10 && medicine.stock < 20 && "text-yellow-600"
                      )}>
                        {medicine.stock}
                      </TableCell>
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

      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        if (isSubmittingForm && open) return; 
        setIsDialogOpen(open);
        if (!open) {
          setEditingMedicine(null); 
          form.reset({ name: "", description: "", stock: 0 });
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-headline">{editingMedicine ? "Edit Medicine" : "Add New Medicine"}</DialogTitle>
            <DialogDescription>
              {editingMedicine ? "Update the details and stock of this medicine." : "Enter the details for the new medicine."}
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
               <FormField
                control={form.control}
                name="stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock Quantity</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g., 100" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild>
                   <Button type="button" variant="outline" disabled={isSubmittingForm}>Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={isSubmittingForm}>
                  {isSubmittingForm ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                  {isSubmittingForm ? "Saving..." : (editingMedicine ? "Save Changes" : "Add Medicine")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
