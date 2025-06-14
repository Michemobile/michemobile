-- Add RLS policies for the profiles table
CREATE POLICY "Authenticated users can create profiles" ON profiles
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own profiles" ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Add RLS policies for the bookings table
CREATE POLICY "Authenticated users can create bookings" ON bookings
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Clients can update their own bookings" ON bookings
  FOR UPDATE
  USING (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Professionals can update bookings assigned to them" ON bookings
  FOR UPDATE
  USING (auth.uid() IN (
    SELECT p.profile_id FROM professionals p WHERE p.id = professional_id
  ))
  WITH CHECK (
    auth.uid() IN (
      SELECT p.profile_id FROM professionals p WHERE p.id = professional_id
    )
  );

-- Add RLS policies for other tables if needed
CREATE POLICY "Authenticated users can create services" ON services
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Professionals can update their own services" ON services
  FOR UPDATE
  USING (auth.uid() IN (
    SELECT p.profile_id FROM professionals p WHERE p.id = professional_id
  ))
  WITH CHECK (
    auth.uid() IN (
      SELECT p.profile_id FROM professionals p WHERE p.id = professional_id
    )
  );
