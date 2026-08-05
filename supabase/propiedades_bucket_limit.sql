-- Ampliar límite de fichero del bucket propiedades a 200 MB (por defecto Supabase pone 50 MB)
update storage.buckets
   set file_size_limit = 200 * 1024 * 1024,
       allowed_mime_types = null
 where id = 'propiedades';
