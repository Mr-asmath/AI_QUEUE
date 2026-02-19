import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FaUser, FaExclamationTriangle, FaCrown, FaClock } from 'react-icons/fa';
import toast from 'react-hot-toast';

const TokenGeneration = ({ user }) => {
  const [formData, setFormData] = useState({
    age: '',
    emergency: false,
    token_type: 'regular'
  });
  const [loading, setLoading] = useState(false);
  const [generatedToken, setGeneratedToken] = useState(null);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.age || formData.age < 0 || formData.age > 150) {
      toast.error('Please enter a valid age');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post('/token', formData);
      setGeneratedToken(response.data.data);
      toast.success('Token generated successfully!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to generate token');
    } finally {
      setLoading(false);
    }
  };

  const handleNewToken = () => {
    setGeneratedToken(null);
    setFormData({
      age: '',
      emergency: false,
      token_type: 'regular'
    });
  };

  if (generatedToken) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="card max-w-md w-full text-center">
          <div className="mb-6">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaUser className="text-4xl text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Token Generated!</h2>
            <p className="text-gray-600 mt-2">Your token has been created successfully</p>
          </div>

          <div className="bg-primary-50 rounded-lg p-6 mb-6">
            <div className="text-6xl font-bold text-primary-600 mb-2">
              #{generatedToken.token_number}
            </div>
            <p className="text-gray-600">Your Token Number</p>
          </div>

          <div className="space-y-3 mb-6">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="text-gray-600">Position in Queue:</span>
              <span className="font-bold text-gray-800">{generatedToken.position}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="text-gray-600">Estimated Wait Time:</span>
              <span className="font-bold text-gray-800">{generatedToken.estimated_wait_time} minutes</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="text-gray-600">Priority Score:</span>
              <span className="font-bold text-gray-800">{generatedToken.priority}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="text-gray-600">Estimated Completion:</span>
              <span className="font-bold text-gray-800">
                {new Date(generatedToken.estimated_completion_time).toLocaleTimeString()}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleNewToken}
              className="w-full btn-primary"
            >
              Generate Another Token
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full btn-secondary"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="card max-w-md w-full">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800">Get Your Token</h2>
          <p className="text-gray-600 mt-2">Generate a queue token instantly</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Age
            </label>
            <input
              type="number"
              name="age"
              value={formData.age}
              onChange={handleChange}
              className="input-field"
              placeholder="Enter your age"
              min="0"
              max="150"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Token Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, token_type: 'regular' })}
                className={`p-3 rounded-lg border-2 transition ${
                  formData.token_type === 'regular'
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="block text-lg mb-1">🎫</span>
                <span className="font-medium">Regular</span>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, token_type: 'vip' })}
                className={`p-3 rounded-lg border-2 transition ${
                  formData.token_type === 'vip'
                    ? 'border-purple-600 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="block text-lg mb-1">👑</span>
                <span className="font-medium">VIP</span>
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              name="emergency"
              id="emergency"
              checked={formData.emergency}
              onChange={handleChange}
              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
            />
            <label htmlFor="emergency" className="text-sm font-medium text-gray-700">
              This is an emergency case
            </label>
          </div>

          {formData.emergency && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div className="flex">
                <FaExclamationTriangle className="text-yellow-400 mr-2" />
                <p className="text-sm text-yellow-700">
                  Emergency cases will be given higher priority in the queue.
                </p>
              </div>
            </div>
          )}

          {formData.token_type === 'vip' && (
            <div className="bg-purple-50 border-l-4 border-purple-400 p-4">
              <div className="flex">
                <FaCrown className="text-purple-400 mr-2" />
                <p className="text-sm text-purple-700">
                  VIP tokens receive priority boost in the queue.
                </p>
              </div>
            </div>
          )}

          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <FaClock className="text-blue-500 mt-1" />
              <div>
                <h4 className="font-medium text-blue-800">Important Notes:</h4>
                <ul className="text-sm text-blue-600 mt-1 list-disc list-inside">
                  <li>Priority is calculated based on age, emergency, and wait time</li>
                  <li>Emergency cases and senior citizens get higher priority</li>
                  <li>You can track your token status on the dashboard</li>
                </ul>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Generating...
              </div>
            ) : (
              'Generate Token'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default TokenGeneration;