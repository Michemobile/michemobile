import { supabase } from './supabase';

/**
 * Email service for sending notifications
 */
export const emailService = {
  /**
   * Send an email notification when a new professional signs up
   * @param professionalId The ID of the professional who signed up
   * @returns Promise with the result of the email sending operation
   */
  async sendProfessionalSignupNotification(professionalId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          type: 'professional_signup',
          professionalId,
          recipientEmail: 'contact@michemobile.online' // Admin email
        }
      });

      if (error) {
        console.error('Error sending professional signup notification:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Exception sending professional signup notification:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Send an approval notification to a professional
   * @param professionalId The ID of the professional who was approved
   * @param professionalEmail The email of the professional
   * @returns Promise with the result of the email sending operation
   */
  async sendProfessionalApprovalNotification(professionalId: string, professionalEmail: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          type: 'professional_approval',
          professionalId,
          recipientEmail: professionalEmail
        }
      });

      if (error) {
        console.error('Error sending professional approval notification:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Exception sending professional approval notification:', error);
      return { success: false, error: error.message };
    }
  }
};
