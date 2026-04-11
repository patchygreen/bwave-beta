// Data types for bwave

export type Profile = {
  id: string
  email: string
  created_at: string
  updated_at: string
}

export type Upload = {
  id: string
  profile_id: string
  file_name: string
  file_path: string
  file_type: 'pdf' | 'image'
  created_at: string
}

export type ProductWave = {
  id: string
  upload_id: string
  profile_id: string
  extracted_data: ProductData
  created_at: string
  updated_at: string
}

export type CsvExport = {
  id: string
  wave_id: string
  profile_id: string
  csv_path: string
  created_at: string
}

export type ProductData = {
  title: string
  vendor: string
  product_type: string
  description: string
  price: string
  compare_at_price: string
  sizes: string[]
  colors: string[]
  materials: string
  care_instructions: string
  size_fit: string
  tags: string[]
  images: string[]
}
