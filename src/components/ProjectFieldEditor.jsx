import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, X, Edit2, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

const ProjectFieldEditor = ({ 
  value, 
  onSave, 
  label, 
  type = 'text', 
  formatter = (val) => val,
  className 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setTempValue(value);
  }, [value]);

  const handleSave = async () => {
    if (tempValue === value) {
      setIsEditing(false);
      return;
    }

    setIsLoading(true);
    try {
      await onSave(type === 'number' ? parseFloat(tempValue) : tempValue);
      setIsEditing(false);
      toast({
        title: "Updated",
        description: `${label} updated successfully.`,
        variant: "success",
        duration: 2000
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update value.",
        variant: "destructive"
      });
      setTempValue(value);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setTempValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') handleCancel();
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1 min-w-[120px]">
        <Input
          type={type}
          value={tempValue}
          onChange={(e) => setTempValue(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          className="h-8 text-sm px-2 py-1"
          disabled={isLoading}
        />
        <Button 
          size="sm" 
          variant="ghost" 
          className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50" 
          onClick={handleSave}
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        </Button>
        <Button 
          size="sm" 
          variant="ghost" 
          className="h-8 w-8 p-0 text-red-400 hover:text-red-500 hover:bg-red-50" 
          onClick={handleCancel}
          disabled={isLoading}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div 
      className={cn("group flex items-center gap-2 cursor-pointer py-1 px-2 -ml-2 rounded hover:bg-gray-100 transition-colors", className)}
      onClick={() => setIsEditing(true)}
      title={`Click to edit ${label}`}
    >
      <span className={cn("truncate", !value && "text-gray-400 italic")}>
        {value ? formatter(value) : 'Not set'}
      </span>
      <Edit2 className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
    </div>
  );
};

export default ProjectFieldEditor;