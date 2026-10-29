import tensorflow as tf
import os
import json
import numpy as np
from PIL import Image
import logging
from sklearn.model_selection import train_test_split
from tensorflow.keras.utils import to_categorical
from tensorflow.keras.preprocessing.image import ImageDataGenerator

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_model_architecture(num_classes):
    """Create a CNN model for plant disease classification"""
    model = tf.keras.Sequential([
        tf.keras.layers.Conv2D(32, (3, 3), activation='relu', input_shape=(224, 224, 3)),
        tf.keras.layers.MaxPooling2D(2, 2),
        tf.keras.layers.Conv2D(64, (3, 3), activation='relu'),
        tf.keras.layers.MaxPooling2D(2, 2),
        tf.keras.layers.Conv2D(128, (3, 3), activation='relu'),
        tf.keras.layers.MaxPooling2D(2, 2),
        tf.keras.layers.Conv2D(128, (3, 3), activation='relu'),
        tf.keras.layers.MaxPooling2D(2, 2),
        tf.keras.layers.Flatten(),
        tf.keras.layers.Dropout(0.5),
        tf.keras.layers.Dense(512, activation='relu'),
        tf.keras.layers.Dense(num_classes, activation='softmax')
    ])
    
    model.compile(
        optimizer='adam',
        loss='categorical_crossentropy',
        metrics=['accuracy']
    )
    
    return model

def load_and_preprocess_data(data_dir):
    """Load and preprocess the dataset"""
    # Use ImageDataGenerator for data loading and augmentation
    datagen = ImageDataGenerator(
        rescale=1./255,
        rotation_range=20,
        width_shift_range=0.2,
        height_shift_range=0.2,
        horizontal_flip=True,
        validation_split=0.2
    )
    
    train_generator = datagen.flow_from_directory(
        data_dir,
        target_size=(224, 224),
        batch_size=32,
        class_mode='categorical',
        subset='training'
    )
    
    validation_generator = datagen.flow_from_directory(
        data_dir,
        target_size=(224, 224),
        batch_size=32,
        class_mode='categorical',
        subset='validation'
    )
    
    return train_generator, validation_generator

def train_model(data_dir, model_save_path, class_indices_path):
    """Train the plant disease classification model"""
    try:
        logger.info("Loading and preprocessing data...")
        train_gen, val_gen = load_and_preprocess_data(data_dir)
        
        # Get number of classes
        num_classes = len(train_gen.class_indices)
        logger.info(f"Number of classes: {num_classes}")
        
        # Create model
        logger.info("Creating model architecture...")
        model = create_model_architecture(num_classes)
        model.summary()
        
        # Train model
        logger.info("Starting training...")
        history = model.fit(
            train_gen,
            steps_per_epoch=train_gen.samples // train_gen.batch_size,
            validation_data=val_gen,
            validation_steps=val_gen.samples // val_gen.batch_size,
            epochs=20,
            callbacks=[
                tf.keras.callbacks.EarlyStopping(patience=5, restore_best_weights=True),
                tf.keras.callbacks.ReduceLROnPlateau(patience=3, factor=0.5)
            ]
        )
        
        # Save model
        logger.info(f"Saving model to: {model_save_path}")
        os.makedirs(os.path.dirname(model_save_path), exist_ok=True)
        model.save(model_save_path)
        
        # Save class indices
        logger.info(f"Saving class indices to: {class_indices_path}")
        class_indices = {v: k for k, v in train_gen.class_indices.items()}
        with open(class_indices_path, 'w') as f:
            json.dump(class_indices, f, indent=2)
        
        logger.info("Training completed successfully!")
        return model, history
        
    except Exception as e:
        logger.error(f"Error during training: {str(e)}")
        raise

def test_model_loading(model_path, class_indices_path):
    """Test if the saved model can be loaded correctly"""
    try:
        logger.info("Testing model loading...")
        
        # Load model
        model = tf.keras.models.load_model(model_path)
        logger.info("Model loaded successfully!")
        
        # Load class indices
        with open(class_indices_path, 'r') as f:
            class_indices = json.load(f)
        logger.info("Class indices loaded successfully!")
        
        # Test prediction with dummy data
        dummy_input = np.random.random((1, 224, 224, 3))
        prediction = model.predict(dummy_input)
        predicted_class = class_indices[str(np.argmax(prediction))]
        
        logger.info(f"Test prediction successful! Predicted class: {predicted_class}")
        return True
        
    except Exception as e:
        logger.error(f"Error testing model: {str(e)}")
        return False

def create_and_save_empty_model():
    """Create and save a model with correct architecture (without training)"""
    try:
        model_save_path = "Disease prediction Model/trained_model/plant_disease_prediction.keras"
        
        # Create model with 38 classes (from your class_indices.json)
        logger.info("Creating model with correct architecture...")
        model = create_model_architecture(38)
        
        # Save model
        logger.info(f"Saving model to: {model_save_path}")
        os.makedirs(os.path.dirname(model_save_path), exist_ok=True)
        model.save(model_save_path)
        
        logger.info("Empty model saved successfully! You can now load it without errors.")
        logger.info("Note: This model has random weights. Train it properly for actual predictions.")
        
        return model
        
    except Exception as e:
        logger.error(f"Error creating empty model: {str(e)}")
        raise

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "create_empty":
        # Just create an empty model with correct architecture
        create_and_save_empty_model()
    else:
        # Full training mode
        data_dir = "path/to/your/plant/disease/dataset"  # Update this path
        model_save_path = "Disease prediction Model/trained_model/plant_disease_prediction.keras"
        class_indices_path = "Disease prediction Model/class_indices.json"
        
        # Check if data directory exists
        if not os.path.exists(data_dir):
            logger.error(f"Data directory not found: {data_dir}")
            logger.info("Please update the 'data_dir' variable with the correct path to your dataset")
            logger.info("Dataset should be organized as: data_dir/class_name/image_files")
            logger.info("Or run 'python retrain_model.py create_empty' to create an empty model with correct architecture")
            exit(1)
        
        try:
            # Train model
            model, history = train_model(data_dir, model_save_path, class_indices_path)
            
            # Test model loading
            if test_model_loading(model_save_path, class_indices_path):
                logger.info("Model training and saving completed successfully!")
            else:
                logger.error("Model loading test failed!")
                
        except Exception as e:
            logger.error(f"Training failed: {str(e)}")
