import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CONFIRMATION_TEXT = "DELETE";

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({ isOpen, onClose }) => {
  const [confirmationInput, setConfirmationInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleConfirm = async () => {
    if (confirmationInput !== CONFIRMATION_TEXT) return;

    try {
      setIsDeleting(true);

      // Get the current user session for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) throw new Error('Not authenticated');

      // Call the Edge Function to handle complete account deletion
      const { data, error } = await supabase.functions.invoke('delete-user-account', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('Edge Function error:', error);
        throw new Error(error.message || 'Failed to delete account');
      }

      // Success! Close modal and redirect
      onClose();
      toast({
        title: "Account Deleted",
        description: "Your account and all associated data have been permanently deleted.",
      });
      
      // Sign out and redirect to home
      await supabase.auth.signOut();
      navigate('/', { replace: true });

    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete account. Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setConfirmationInput("");
    }
  };

  const handleModalClose = () => {
    setConfirmationInput(""); // Reset input on close
    onClose();
  }

  if (!isOpen) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && handleModalClose()}>
      <AlertDialogContent className="bg-white">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-2xl font-bold text-red-600">Permanently Delete Account?</AlertDialogTitle>
          <AlertDialogDescription className="text-gray-600">
            This action is irreversible and will permanently delete all your data, including your profile, 
            bookings, services, portfolio, and any other associated information. 
            <br /><br />
            Please be absolutely sure before proceeding.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="my-4 space-y-2">
          <Label htmlFor="confirmationText" className="text-sm font-medium text-gray-700">
            To confirm, please type "<strong className='text-red-600'>{CONFIRMATION_TEXT}</strong>" in the box below:
          </Label>
          <Input 
            id="confirmationText"
            type="text"
            value={confirmationInput}
            onChange={(e) => setConfirmationInput(e.target.value)}
            placeholder={CONFIRMATION_TEXT}
            className="border-gray-300 focus:border-red-500 focus:ring-red-500"
          />
        </div>

        <AlertDialogFooter className="mt-6">
          <AlertDialogCancel 
            asChild
            onClick={handleModalClose}
          >
            <Button variant="outline">Cancel</Button>
          </AlertDialogCancel>
          <AlertDialogAction 
            asChild
            disabled={confirmationInput !== CONFIRMATION_TEXT || isDeleting}
          >
            <Button 
              variant="destructive" 
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={confirmationInput !== CONFIRMATION_TEXT || isDeleting}
              onClick={handleConfirm}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Account Permanently"
              )}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
