import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaSearch, FaDownload, FaCalendar, FaFilter } from 'react-icons/fa';
import { format, subDays } from 'date-fns';
import toast from 'react-hot-toast';

const QueueHistory = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    status: '',
    token_type: '',
    page: 1,
    limit: 20
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0
  });
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, [filters]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        ...filters,
        startDate: filters.startDate,
        endDate: filters.endDate
      }).toString();

      const response = await axios.get(`/admin/queue/history?${queryParams}`);
      setHistory(response.data.data.history);
      setPagination(response.data.data.pagination);
      setSummary(response.data.data.summary);
    } catch (error) {
      toast.error('Failed to fetch history');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
      page: 1
    });
  };

  const handleExport = () => {
    const csvContent = [
      ['Token #', 'User', 'Age', 'Type', 'Status', 'Wait Time', 'Service Time', 'Date'],
      ...history.map(h => [
        h.token_number,
        h.user_name,
        h.age,
        h.token_type,
        h.status,
        `${h.waiting_time?.toFixed(1) || 0} min`,
        `${h.service_time?.toFixed(1) || 0} min`,
        format(new Date(h.date), 'yyyy-MM-dd HH:mm')
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `queue-history-${filters.startDate}-to-${filters.endDate}.csv`;
    a.click();
  };

  const getStatusBadge = (status) => {
    const badges = {
      waiting: 'badge-waiting',
      called: 'badge-called',
      completed: 'badge-completed',
      cancelled: 'badge-cancelled'
    };
    return badges[status] || 'badge-waiting';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Queue History</h1>
        <button
          onClick={handleExport}
          className="btn-secondary flex items-center space-x-2"
          disabled={history.length === 0}
        >
          <FaDownload />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card bg-blue-50">
            <p className="text-sm text-blue-600">Total Tokens</p>
            <p className="text-2xl font-bold text-blue-700">{summary.total || 0}</p>
          </div>
          <div className="card bg-green-50">
            <p className="text-sm text-green-600">Avg Wait Time</p>
            <p className="text-2xl font-bold text-green-700">
              {summary.avgWaitTime?.toFixed(1) || 0} min
            </p>
          </div>
          <div className="card bg-purple-50">
            <p className="text-sm text-purple-600">Emergency Cases</p>
            <p className="text-2xl font-bold text-purple-700">{summary.emergency || 0}</p>
          </div>
          <div className="card bg-yellow-50">
            <p className="text-sm text-yellow-600">VIP Tokens</p>
            <p className="text-2xl font-bold text-yellow-700">{summary.vip || 0}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card">
        <div className="flex items-center space-x-2 mb-4">
          <FaFilter className="text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-800">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              name="startDate"
              value={filters.startDate}
              onChange={handleFilterChange}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="input-field"
            >
              <option value="">All</option>
              <option value="waiting">Waiting</option>
              <option value="called">Called</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Token Type
            </label>
            <select
              name="token_type"
              value={filters.token_type}
              onChange={handleFilterChange}
              className="input-field"
            >
              <option value="">All</option>
              <option value="regular">Regular</option>
              <option value="vip">VIP</option>
            </select>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="card">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FaCalendar className="text-5xl mx-auto mb-4 opacity-30" />
            <p>No history found for the selected period</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Token #</th>
                    <th className="text-left py-3 px-4">User</th>
                    <th className="text-left py-3 px-4">Age</th>
                    <th className="text-left py-3 px-4">Type</th>
                    <th className="text-left py-3 px-4">Status</th>
                    <th className="text-left py-3 px-4">Wait Time</th>
                    <th className="text-left py-3 px-4">Service Time</th>
                    <th className="text-left py-3 px-4">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr key={item._id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">#{item.token_number}</td>
                      <td className="py-3 px-4">{item.user_name}</td>
                      <td className="py-3 px-4">{item.age}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          item.token_type === 'vip' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100'
                        }`}>
                          {item.token_type}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={getStatusBadge(item.status)}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">{item.waiting_time?.toFixed(1)} min</td>
                      <td className="py-3 px-4">{item.service_time?.toFixed(1)} min</td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {format(new Date(item.date), 'MMM dd, yyyy HH:mm')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-gray-600">
                Showing {((pagination.page - 1) * filters.limit) + 1} to{' '}
                {Math.min(pagination.page * filters.limit, pagination.total)} of{' '}
                {pagination.total} results
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                  disabled={filters.page === 1}
                  className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-3 py-1 bg-primary-600 text-white rounded">
                  {filters.page}
                </span>
                <button
                  onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                  disabled={filters.page === pagination.pages}
                  className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default QueueHistory;