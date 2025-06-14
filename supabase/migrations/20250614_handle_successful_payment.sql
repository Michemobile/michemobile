-- Function to handle successful payment
create or replace function handle_successful_payment(
  p_booking_id uuid,
  p_amount numeric
) returns json
language plpgsql
security definer
as $$
declare
  v_professional_id uuid;
  v_result json;
begin
  -- Start transaction
  begin
    -- Update booking status to confirmed
    update bookings
    set 
      status = 'confirmed',
      updated_at = now()
    where id = p_booking_id
    returning professional_id into v_professional_id;

    -- Add the amount to professional's total revenue
    update professionals
    set 
      total_revenue = coalesce(total_revenue, 0) + p_amount,
      updated_at = now()
    where id = v_professional_id;

    -- Get the updated booking details
    select json_build_object(
      'booking_id', b.id,
      'status', b.status,
      'professional_id', b.professional_id,
      'amount', b.total_amount,
      'updated_at', b.updated_at
    ) into v_result
    from bookings b
    where b.id = p_booking_id;

    -- Commit transaction
    return v_result;
  end;
end;
$$;
