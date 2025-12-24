from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import pydicom
from pydicom.dataset import Dataset, FileDataset
from pydicom.uid import generate_uid, ExplicitVRLittleEndian, SecondaryCaptureImageStorage
from PIL import Image
import numpy as np
import io
import os
import tempfile
import uuid
import datetime
import time
from werkzeug.utils import secure_filename
import traceback
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, origins=["http://64.227.187.164", "http://localhost:3000", "http://157.245.86.199"])

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'service': 'DICOM Conversion Server',
        'timestamp': datetime.datetime.now().isoformat()
    })

@app.route('/convert-to-dicom', methods=['POST'])
def convert_to_dicom():
    """Convert images to DICOM format"""
    try:
        logger.info("🔄 DICOM conversion request received")
        
        # Check if files are present
        if 'images' not in request.files:
            return jsonify({'error': 'No images provided'}), 400
        
        files = request.files.getlist('images')
        if not files or len(files) == 0:
            return jsonify({'error': 'No files selected'}), 400
        
        # Get metadata from form data
        metadata = {
            'patient_name': request.form.get('patientName', 'UNKNOWN^PATIENT'),
            'patient_id': request.form.get('patientId', 'UNKNOWN'),
            'patient_birth_date': request.form.get('patientBirthDate', ''),
            'patient_sex': request.form.get('patientSex', 'O'),
            'study_instance_uid': request.form.get('studyInstanceUID', generate_uid()),
            'series_instance_uid': request.form.get('seriesInstanceUID', generate_uid()),
            'study_description': request.form.get('studyDescription', 'Uploaded Image Study'),
            'series_description': request.form.get('seriesDescription', 'Uploaded Image Series'),
            'modality': request.form.get('modality', 'OT'),
            'institution_name': request.form.get('institutionName', 'XCENTIC Medical Center'),
            'manufacturer': request.form.get('manufacturer', 'XCENTIC'),
            'accession_number': request.form.get('accessionNumber', f'ACC{int(time.time())}'),
            'referring_physician': request.form.get('referringPhysician', ''),
            'body_part_examined': request.form.get('bodyPartExamined', ''),
        }
        
        logger.info(f"📊 Converting {len(files)} files for patient: {metadata['patient_name']}")
        
        dicom_files = []
        
        # Process each image
        for index, file in enumerate(files):
            if file.filename == '':
                continue
                
            try:
                logger.info(f"🔄 Processing file {index + 1}/{len(files)}: {file.filename}")
                
                # Read image data
                image_data = file.read()
                
                # Convert to DICOM
                dicom_buffer = create_dicom_from_image(
                    image_data, 
                    metadata, 
                    index,
                    file.filename
                )
                
                # Generate SOP Instance UID for this image
                sop_instance_uid = generate_uid()
                
                dicom_files.append({
                    'filename': f'image_{index + 1}_{sop_instance_uid}.dcm',
                    'buffer': dicom_buffer,
                    'size': len(dicom_buffer),
                    'sop_instance_uid': sop_instance_uid,
                    'original_filename': file.filename
                })
                
                logger.info(f"✅ File {index + 1} converted successfully - Size: {len(dicom_buffer)} bytes")
                
            except Exception as e:
                logger.error(f"❌ Error converting file {index + 1}: {str(e)}")
                logger.error(traceback.format_exc())
                continue
        
        if not dicom_files:
            return jsonify({'error': 'Failed to convert any images'}), 500
        
        # Create response with DICOM files as base64
        import base64
        response_files = []
        
        for dicom_file in dicom_files:
            response_files.append({
                'filename': dicom_file['filename'],
                'buffer': base64.b64encode(dicom_file['buffer']).decode('utf-8'),
                'size': dicom_file['size'],
                'sop_instance_uid': dicom_file['sop_instance_uid'],
                'original_filename': dicom_file['original_filename']
            })
        
        logger.info(f"✅ Successfully converted {len(response_files)} files")
        
        return jsonify({
            'success': True,
            'files': response_files,
            'total_files': len(response_files),
            'metadata': metadata
        })
        
    except Exception as e:
        logger.error(f"❌ Error in convert_to_dicom: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

def create_dicom_from_image(image_data, metadata, index, original_filename):
    """Create a DICOM file from image data using pydicom (with color support)"""
    try:
        # Open and process image
        image = Image.open(io.BytesIO(image_data))
        
        # 🔧 FIXED: Preserve color information
        logger.info(f"Original image mode: {image.mode}, size: {image.size}")
        
        # Determine if image is color or grayscale
        is_color = image.mode in ['RGB', 'RGBA', 'P']
        
        # Process based on image type
        if is_color:
            # Convert to RGB if not already (handles RGBA, P modes)
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Get image dimensions and pixel data
            width, height = image.size
            pixel_data = image.tobytes()
            
            # DICOM parameters for color images
            samples_per_pixel = 3
            photometric_interpretation = "RGB"
            bits_allocated = 8
            bits_stored = 8
            high_bit = 7
            pixel_representation = 0
            planar_configuration = 0  # 0 = RGB RGB RGB..., 1 = RRR...GGG...BBB...
            
            logger.info(f"Processing as COLOR image: {width}x{height}, RGB")
            
        else:
            # Convert to grayscale
            if image.mode != 'L':
                image = image.convert('L')
            
            # Get image dimensions and pixel data
            width, height = image.size
            pixel_data = image.tobytes()
            
            # DICOM parameters for grayscale images
            samples_per_pixel = 1
            photometric_interpretation = "MONOCHROME2"
            bits_allocated = 8
            bits_stored = 8
            high_bit = 7
            pixel_representation = 0
            planar_configuration = None  # Not used for grayscale
            
            logger.info(f"Processing as GRAYSCALE image: {width}x{height}")
        
        # Get current date/time for DICOM
        dt = datetime.datetime.now()
        dicom_date = dt.strftime('%Y%m%d')
        dicom_time = dt.strftime('%H%M%S')
        
        # Generate UIDs
        sop_instance_uid = generate_uid()
        
        # Create File Meta Information
        file_meta = Dataset()
        file_meta.MediaStorageSOPClassUID = SecondaryCaptureImageStorage
        file_meta.MediaStorageSOPInstanceUID = sop_instance_uid
        file_meta.ImplementationClassUID = "1.2.826.0.1.3680043.8.498"
        file_meta.ImplementationVersionName = "XCENTIC_DICOM_v1.0"
        file_meta.TransferSyntaxUID = ExplicitVRLittleEndian
        
        # Create main dataset
        ds = FileDataset("temp", {}, file_meta=file_meta, preamble=b"\0" * 128)
        
        # Patient Module
        ds.PatientName = metadata['patient_name']
        ds.PatientID = metadata['patient_id']
        ds.PatientBirthDate = metadata['patient_birth_date'].replace('-', '') if metadata['patient_birth_date'] else ''
        ds.PatientSex = metadata['patient_sex']
        
        # General Study Module
        ds.StudyInstanceUID = metadata['study_instance_uid']
        ds.StudyDate = dicom_date
        ds.StudyTime = dicom_time
        ds.StudyID = "1"
        ds.AccessionNumber = metadata['accession_number']
        ds.StudyDescription = metadata['study_description']
        ds.ReferringPhysicianName = metadata['referring_physician']
        
        # General Series Module
        ds.SeriesInstanceUID = metadata['series_instance_uid']
        ds.SeriesNumber = "1"
        ds.SeriesDate = dicom_date
        ds.SeriesTime = dicom_time
        ds.Modality = metadata['modality']
        ds.SeriesDescription = metadata['series_description']
        ds.BodyPartExamined = metadata['body_part_examined']
        
        # General Equipment Module
        ds.Manufacturer = metadata['manufacturer']
        ds.ManufacturerModelName = "XCENTIC_UPLOADER"
        ds.SoftwareVersions = "v1.0"
        ds.StationName = "XCENTIC_STATION"
        
        # General Image Module
        ds.ImageType = ["ORIGINAL", "PRIMARY"]
        ds.InstanceNumber = str(index + 1)
        ds.ContentDate = dicom_date
        ds.ContentTime = dicom_time
        
        # SOP Common Module
        ds.SOPClassUID = SecondaryCaptureImageStorage
        ds.SOPInstanceUID = sop_instance_uid
        
        # SC Equipment Module (Secondary Capture specific)
        ds.ConversionType = "DI"  # Digitized from Image
        
        # 🔧 FIXED: Image Pixel Module with color support
        ds.SamplesPerPixel = samples_per_pixel
        ds.PhotometricInterpretation = photometric_interpretation
        ds.Rows = height
        ds.Columns = width
        ds.BitsAllocated = bits_allocated
        ds.BitsStored = bits_stored
        ds.HighBit = high_bit
        ds.PixelRepresentation = pixel_representation
        
        # Add planar configuration only for color images
        if is_color:
            ds.PlanarConfiguration = planar_configuration
        
        # Institution Module
        ds.InstitutionName = metadata['institution_name']
        
        # Set pixel data
        ds.PixelData = pixel_data
        
        # Additional useful tags
        ds.SpecificCharacterSet = 'ISO_IR 100'
        color_info = "COLOR" if is_color else "GRAYSCALE"
        ds.ImageComments = f"Converted from {original_filename} using XCENTIC Python DICOM Converter ({color_info})"
        
        # Write to buffer
        buffer = io.BytesIO()
        ds.save_as(buffer, write_like_original=False)
        buffer.seek(0)
        
        logger.info(f"✅ DICOM created - Mode: {color_info}, Size: {len(buffer.getvalue())} bytes")
        
        return buffer.getvalue()
        
    except Exception as e:
        logger.error(f"Error creating DICOM from image: {str(e)}")
        logger.error(traceback.format_exc())
        raise

@app.route('/test-convert', methods=['POST'])
def test_convert():
    """Simple test endpoint for DICOM conversion"""
    try:
        # Create a simple test image
        test_image = Image.new('L', (100, 100), color=128)
        
        # Convert to bytes
        img_buffer = io.BytesIO()
        test_image.save(img_buffer, format='PNG')
        img_data = img_buffer.getvalue()
        
        # Test metadata
        metadata = {
            'patient_name': 'TEST^PATIENT',
            'patient_id': 'TEST123',
            'patient_birth_date': '19900101',
            'patient_sex': 'O',
            'study_instance_uid': generate_uid(),
            'series_instance_uid': generate_uid(),
            'study_description': 'Test Study',
            'series_description': 'Test Series',
            'modality': 'OT',
            'institution_name': 'Test Institution',
            'manufacturer': 'XCENTIC',
            'accession_number': 'TEST001',
            'referring_physician': '',
            'body_part_examined': '',
        }
        
        # Convert to DICOM
        dicom_buffer = create_dicom_from_image(img_data, metadata, 0, 'test.png')
        
        return jsonify({
            'success': True,
            'message': f'Test DICOM created successfully - Size: {len(dicom_buffer)} bytes',
            'size': len(dicom_buffer)
        })
        
    except Exception as e:
        logger.error(f"Test conversion failed: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    logger.info("🐍 Starting DICOM Conversion Server...")
    logger.info("📦 Dependencies: pydicom, PIL, numpy, flask")
    
    # Run in debug mode for development
    app.run(
        host='0.0.0.0', 
        port=8765, 
        debug=True,
        threaded=True
    )