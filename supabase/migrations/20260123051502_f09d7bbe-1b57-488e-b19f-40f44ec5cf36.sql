-- Drop the old check constraint and add updated one that includes 'document'
ALTER TABLE public.knowledge_sources DROP CONSTRAINT IF EXISTS knowledge_sources_source_type_check;

ALTER TABLE public.knowledge_sources ADD CONSTRAINT knowledge_sources_source_type_check 
  CHECK (source_type IN ('url', 'text', 'document'));