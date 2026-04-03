import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProjectFinancials } from '@/hooks/useProjectFinancials';

const EditablePlannedField = ({ 
  value, 
  onSave, 
  label, 
  formatter, 
  className, 
  inputClassName,
  containerClassName
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);
  const { formatCurrency } = useProjectFinancials();

  const displayFormatter = formatter || formatCurrency;

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    if (!isEditing) {
      setTempValue(value);
    }
  }, [value, isEditing]);

  const handleSave = async () => {
    if (parseFloat(tempValue) === parseFloat(value)) {
      setIsEditing(false);
      return;
    }

    setIsLoading(true);
    try {
      await onSave(parseFloat(tempValue));
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setTempValue(value);
    }
  };

  if (isEditing) {
    return (
      <div className={cn("flex items-center gap-1", containerClassName)}>
        <div className="relative">
          <Input
            ref={inputRef}
            type="number"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className={cn("h-7 py-1 px-2 text-xs w-24 pr-1", inputClassName)}
            placeholder={label}
          />
        </div>
        <div className="flex items-center">
            <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-50"
            onClick={handleSave}
            disabled={isLoading}
            >
            {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            </Button>
            <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 text-red-400 hover:text-red-500 hover:bg-red-50"
            onClick={() => {
                setIsEditing(false);
                setTempValue(value);
            }}
            disabled={isLoading}
            >
            <X className="h-3.5 w-3.5" />
            </Button>
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={() => setIsEditing(true)}
      className={cn(
        "cursor-pointer hover:bg-gray-100 rounded px-1 py-0.5 -mx-1 transition-colors border border-transparent hover:border-gray-200 group flex items-center gap-1", 
        className
      )}
      title={`Click to edit ${label || 'value'}`}
    >
      <span>{displayFormatter(value)}</span>
    </div>
  );
};

export default EditablePlannedField;